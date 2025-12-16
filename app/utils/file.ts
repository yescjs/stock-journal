export function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = err => reject(err);
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
    });
}
