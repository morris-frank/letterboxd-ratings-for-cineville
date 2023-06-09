chrome.runtime.onMessage.addListener(function (message, sender, senderResponse) {
  if (message.type === "rating") {
      fetch(`https://letterboxd.com/film/${message.slug}`)
      .then((response) => response.text())
      .then((html) => {
          const regex = /<meta\s+name="twitter:data2"\s+content="([^"]*)"/;
          const match = html.match(regex);
          const rating = match ? match[1] : null;
        senderResponse({ rating: rating });
      });
  }
  return true;
});
