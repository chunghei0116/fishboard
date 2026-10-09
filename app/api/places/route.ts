import { privateUser } from "@/lib/firebase-auth";
import { fail } from "@/lib/fishlog-env";
import { createPlaceSearch, PlaceSearchError } from "@/lib/place-search";

const search = createPlaceSearch();
export async function GET(request: Request) {
  try {
    const { uid } = await privateUser();
    const places = await search(
      uid,
      new URL(request.url).searchParams.get("q") || "",
    );
    return Response.json(
      { places },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof PlaceSearchError)
      return Response.json(
        { error: error.message },
        {
          status: error.status,
          headers: {
            "Cache-Control": "no-store",
            ...(error.status === 429 ? { "Retry-After": "60" } : {}),
          },
        },
      );
    return fail(error);
  }
}
