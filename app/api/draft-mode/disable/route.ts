import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

/** Leaves preview/draft mode and returns to the normal published site. */
export async function GET(request: Request) {
  (await draftMode()).disable();
  return NextResponse.redirect(new URL("/", request.url));
}
