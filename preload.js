window.onload = () => {
    const web = document.getElementById("web");
    const url = document.getElementById("url");

    document.getElementById("back").onclick = () => web.goBack();
    document.getElementById("forward").onclick = () => web.goForward();
    document.getElementById("reload").onclick = () => web.reload();

    url.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            let input = url.value.trim();
            if (!input.startsWith("http")) {
                input = "https://" + input;
            }
            web.loadURL(input);
        }
    });

    web.addEventListener("did-navigate", (e) => {
        url.value = e.url;
    });
};
