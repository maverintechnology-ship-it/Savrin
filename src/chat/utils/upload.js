export const uploadFile = async (file) => {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", "chat_upload");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dtfgceryr/auto/upload",
    {
      method: "POST",
      body: data,
    }
  );

  const result = await res.json();
  
  if (!res.ok) {
    throw new Error(result.error?.message || "Failed to upload file to Cloudinary");
  }
  
  if (!result.secure_url) {
    throw new Error("No secure_url returned from Cloudinary");
  }

  return result.secure_url;
};
