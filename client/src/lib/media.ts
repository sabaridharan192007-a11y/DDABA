const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

export function readImageFile(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return Promise.reject(new Error("Please select a JPG or PNG image."));
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return Promise.reject(new Error("Images must be 2MB or smaller."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to read the selected image."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}
