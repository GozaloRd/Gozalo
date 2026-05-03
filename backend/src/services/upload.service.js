function baseUrl() {
  return process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`;
}

function buildSingleImageResponse(file) {
  const imageUrl = `${baseUrl()}/uploads/${file.filename}`;
  return {
    success: true,
    url: imageUrl,
    filename: file.filename,
  };
}

function buildMultiImagesResponse(files) {
  const urls = files.map((file) => `${baseUrl()}/uploads/${file.filename}`);
  return {
    success: true,
    urls,
    count: urls.length,
  };
}

module.exports = {
  buildSingleImageResponse,
  buildMultiImagesResponse,
};
