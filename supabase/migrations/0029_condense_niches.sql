-- Condense the niche list from 24 to 17.
--
-- Several options were near-duplicates that split creators across categories
-- a brand would search as one thing (three separate beauty options, gaming vs
-- gadgets, finance vs business). Twenty of the 24 had never been used at all.
--
-- Fitness & Gym / Health & Wellness / Sports & Outdoors were deliberately NOT
-- merged despite overlapping: most of the roster sits there, so it's the one
-- place the distinction is earning its keep.
--
-- Sustainability is removed rather than merged. It's a value that cuts across
-- every category rather than something a brand searches on its own.
--
-- Both beauty options can appear on the same creator, so the secondary array
-- is de-duplicated after remapping or she'd end up with "Beauty & Skincare"
-- twice.

-- Primary niches. No creator currently holds a renamed value, but this runs
-- anyway so the migration is correct on any copy of the database.
update public.creator_profiles set niche = case niche
  when 'Beauty & Makeup'             then 'Beauty & Skincare'
  when 'Skincare'                    then 'Beauty & Skincare'
  when 'Beauty Tech & Nails'         then 'Beauty & Skincare'
  when 'Tech & Gadgets'              then 'Tech & Gaming'
  when 'Gaming'                      then 'Tech & Gaming'
  when 'Finance & Investing'         then 'Business & Finance'
  when 'Business & Entrepreneurship' then 'Business & Finance'
  when 'Comedy & Entertainment'      then 'Entertainment & Music'
  when 'Music & Dance'               then 'Entertainment & Music'
  when 'DIY & Crafts'                then 'Art, Design & DIY'
  when 'Art & Design'                then 'Art, Design & DIY'
  else niche
end
where niche in (
  'Beauty & Makeup','Skincare','Beauty Tech & Nails','Tech & Gadgets','Gaming',
  'Finance & Investing','Business & Entrepreneurship','Comedy & Entertainment',
  'Music & Dance','DIY & Crafts','Art & Design'
);

-- A dropped primary would leave a creator unfindable, so fall back to the
-- closest surviving general category rather than to nothing.
update public.creator_profiles set niche = 'Lifestyle' where niche = 'Sustainability';

-- Secondary niches: remap, drop 'Sustainability', de-duplicate, and keep the
-- primary out of the array.
update public.creator_profiles cp
set secondary_niches = coalesce((
  select array_agg(distinct mapped)
  from (
    select case s
      when 'Beauty & Makeup'             then 'Beauty & Skincare'
      when 'Skincare'                    then 'Beauty & Skincare'
      when 'Beauty Tech & Nails'         then 'Beauty & Skincare'
      when 'Tech & Gadgets'              then 'Tech & Gaming'
      when 'Gaming'                      then 'Tech & Gaming'
      when 'Finance & Investing'         then 'Business & Finance'
      when 'Business & Entrepreneurship' then 'Business & Finance'
      when 'Comedy & Entertainment'      then 'Entertainment & Music'
      when 'Music & Dance'               then 'Entertainment & Music'
      when 'DIY & Crafts'                then 'Art, Design & DIY'
      when 'Art & Design'                then 'Art, Design & DIY'
      else s
    end as mapped
    from unnest(cp.secondary_niches) as s
    where s <> 'Sustainability'
  ) m
  where mapped <> cp.niche
), '{}')
where array_length(cp.secondary_niches, 1) > 0;
