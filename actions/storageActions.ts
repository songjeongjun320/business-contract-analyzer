"use server";

import { createServerSupabaseClient } from "../utils/supabase/server";

function handleError(error: unknown) {
  // Specify the type as 'unknown'
  if (error) {
    console.error(error);
    throw error;
  }
}

export async function uploadFile(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const file = formData.get("file") as File;

  const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error(
      "Storage bucket name is not defined in environment variables."
    );
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(file.name, file, { upsert: true });

  handleError(error);

  return data;
}

export async function searchFiles(search: string = "") {
  const supabase = await createServerSupabaseClient();

  const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error(
      "Storage bucket name is not defined in environment variables."
    );
  }

  const { data, error } = await supabase.storage.from(bucketName).list("", {
    // Changed null to an empty string
    search,
  });

  handleError(error);

  return data;
}
