export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.hostname === "layaaimodel.com" || url.hostname === "www.layaaimodel.com") {
      if (url.hostname === "layaaimodel.com") {
        url.hostname = "www.layaaimodel.com";
        url.protocol = "https:";
        return Response.redirect(url.toString(), 301);
      }
    }
    return new Response("Not found", { status: 404 });
  },
};
