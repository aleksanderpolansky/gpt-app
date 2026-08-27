import { PUBLIC_MEDIA_BUCKET_ID } from "../../../lib/media-storage";
import { supabase } from "../../../lib/supabase";

type MessageMediaRow = {
  id: string;
  message_object_id: string;
  storage_path: string | null;
  byte_size: number | null;
  sha256_hex: string | null;
  width_px: number | null;
  height_px: number | null;
  sort_order: number;
};

export type PublicMessageImage = {
  url: string;
  widthPx: number | null;
  heightPx: number | null;
  byteSize: number | null;
  sha256Hex: string | null;
};

export async function getPublicMessageImageMap(
  messageObjectIds: string[],
): Promise<Map<string, PublicMessageImage>> {
  const result = new Map<string, PublicMessageImage>();
  const ids = Array.from(new Set(messageObjectIds.filter(Boolean)));

  if (ids.length === 0) {
    return result;
  }

  try {
    const { data, error } = await supabase
      .from("message_object_media")
      .select(
        "id,message_object_id,storage_path,byte_size,sha256_hex,width_px,height_px,sort_order",
      )
      .in("message_object_id", ids)
      .eq("media_kind_code", "image")
      .eq("media_origin_code", "native")
      .eq("storage_bucket", PUBLIC_MEDIA_BUCKET_ID)
      .eq("mime_type", "image/webp")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw new Error(`MESSAGE_MEDIA_READ_FAILED:${error.message}`);
    }

    for (const row of (data ?? []) as MessageMediaRow[]) {
      if (result.has(row.message_object_id) || !row.storage_path) {
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from(PUBLIC_MEDIA_BUCKET_ID)
        .getPublicUrl(row.storage_path);
      const url = publicUrlData.publicUrl?.trim() ?? "";

      if (!/^https?:\/\//i.test(url)) {
        continue;
      }

      result.set(row.message_object_id, {
        url,
        widthPx: row.width_px,
        heightPx: row.height_px,
        byteSize: row.byte_size,
        sha256Hex: row.sha256_hex,
      });
    }
  } catch (error) {
    console.warn(
      "Public message media read warning",
      error instanceof Error ? error.message : error,
    );
  }

  return result;
}
