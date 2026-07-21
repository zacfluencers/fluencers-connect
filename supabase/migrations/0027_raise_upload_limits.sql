-- Raise the upload ceiling for creator video.
--
-- Reported 2026-07-21: creators were told "under 150MB" and still got a size
-- rejection. The buckets were never the problem - they were already set to
-- 150MB. Storage enforces a SECOND, project-wide ceiling that overrides any
-- bucket setting, and it sat at the 50MB default. Proof: of 107 files ever
-- uploaded, not one exceeded 50MiB, and five sat just underneath it.
--
-- Most uploads here are .MOV straight off an iPhone, where 50MB buys about
-- 20 seconds of 1080p. Hence 500MB.
--
-- IMPORTANT: this migration alone changes nothing. The effective limit is the
-- LOWER of the bucket limit and the project-wide limit, so the project-wide
-- one must also be raised in the Supabase dashboard:
--   Storage -> Settings -> Upload file size limit -> 500 MB
-- Without that, these buckets stay capped at 50MB no matter what this says.

update storage.buckets
set file_size_limit = 524288000  -- 500 MiB
where id in ('portfolio', 'deliverables');

-- Briefs stay at 100MB (reference decks and images, not finished video) and
-- avatars stay at 10MB. Neither has ever hit its limit.
