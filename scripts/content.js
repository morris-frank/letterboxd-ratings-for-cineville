function removeSuffix(str, suffix) {
  if (str.endsWith(suffix)) {
    return str.slice(0, -suffix.length);
  }
  return str;
}

function removeAccents(str) {
  const accents = "ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿ";
  const normal = "AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuYYy";
  const regex = new RegExp(`[${accents}]`, "g");
  return str.replace(regex, (match) => normal[accents.indexOf(match)]);
}

function makeMovieMenu(node, name, slug, rating) {
  const pureRating = rating.split(" ")[0];
  const isFound = pureRating !== "N/A";
  node.dataset.rating = isFound ? pureRating : 0;

  const link = isFound ? `https://letterboxd.com/film/${slug}` : `https://letterboxd.com/search/${name}`;

  const menu = document.createElement("a");
  menu.style.alignItems = "center";
  menu.style.backgroundColor = "#14181c";
  menu.style.bottom = "0";
  menu.style.color = "#fff";
  menu.style.display = "flex";
  menu.style.fontSize = "0.7em";
  menu.style.gap = "5px";
  menu.style.height = "2.2em";
  menu.style.justifyContent = "center";
  menu.style.position = "absolute";
  menu.style.right = "0";
  menu.style.width = "220px";
  menu.href = link;
  menu.target = "_blank";

  const imgElem = document.createElement("img");
  imgElem.src = "https://a.ltrbxd.com/logos/letterboxd-decal-dots-pos-rgb.svg";
  imgElem.style.width = "2em";
  menu.appendChild(imgElem);
  const ratingElem = document.createElement("span");
  ratingElem.textContent = rating;
  menu.appendChild(ratingElem);

  node.appendChild(menu);
}

function updateShowItem(node) {
  node.style.position = "relative";
  const titleElem = node.querySelector("h3.shows-list-item__title");

  let name = titleElem.textContent;
  name = removeSuffix(name, " (OV)");
  name = removeSuffix(name, " (NL)");
  let slug = removeAccents(name)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-");
  slug = removeSuffix(slug, "-");

  const cacheKey = `rating-${slug}`;
  chrome.storage.local.get([cacheKey], (result) => {
    if (result.hasOwnProperty(cacheKey)) {
      const rating = result[cacheKey];
      makeMovieMenu(node, name, slug, rating);
    } else {
      chrome.runtime.sendMessage({ type: "rating", slug: slug }, (response) => {
        chrome.storage.local.set({ [cacheKey]: rating });
        const rating = response.rating || "N/A";
        makeMovieMenu(node, name, slug, rating);
      });
    }
  });
}

async function run() {
  const showListContainer = document.querySelector(".shows-list div");

  const navContainer = document.querySelector(".film-filters-input");
  const button = document.createElement("button");
  button.textContent = "Sort by rating";
  button.style.marginTop = "1em";
  button.className = "selectable-button";
  button.addEventListener("click", () => {
    const items = Array.from(showListContainer.querySelectorAll(".shows-list-item"));

    // Keep only one movie per title, title is in the textcontent of ".shows-list-item__title" element.
    const titles = new Set();
    const titleNodeAssoc = new Map();
    items.forEach((item) => {
      const title = item.querySelector("h3.shows-list-item__title").textContent;
      if (titles.has(title)) {
        const existingItem = titleNodeAssoc.get(title);

        const timeList = existingItem.querySelector(".shows-list-item__time");
        timeList.textContent +=
          "\n" +
          item.querySelector(".shows-list-item__time__start").textContent +
          "\n" +
          item.querySelector(".shows-list-item__location__name").textContent;

        // const locationList = existingItem.querySelector(".shows-list-item__location");
        // locationList.textContent += "," + item.querySelector(".shows-list-item__location__name").textContent;
      } else {
        titles.add(title);

        const timeList = item.querySelector(".shows-list-item__time");
        timeList.style.overflow = "hidden";
        timeList.style.whiteSpace = "pre";
        timeList.style.textOverflow = "ellipsis";
        timeList.style.fontSize = "0.8em";
        timeList.textContent =
          timeList.querySelector(".shows-list-item__time__start").textContent +
          "\n" +
          item.querySelector(".shows-list-item__location__name").textContent;

        const locationList = item.querySelector(".shows-list-item__location");
        locationList.textContent = ""; //locationList.querySelector(".shows-list-item__location__name").textContent;

        titleNodeAssoc.set(title, item);
      }
    });

    const newItems = Array.from(titleNodeAssoc.values());
    newItems.sort((a, b) => {
      const aRating = parseFloat(a.dataset.rating);
      const bRating = parseFloat(b.dataset.rating);
      if (isNaN(aRating) && isNaN(bRating)) return 0;
      if (isNaN(aRating)) return 1;
      if (isNaN(bRating)) return -1;
      if (aRating < bRating) return 1;
      if (aRating > bRating) return -1;
      return 0;
    });

    // delte existing items
    items.forEach((item) => {
      item.remove();
    });

    newItems.forEach((item) => {
      showListContainer.appendChild(item);
    });
  });
  navContainer.appendChild(button);

  // update existing items
  const showItems = showListContainer.querySelectorAll(".shows-list-item");
  showItems.forEach((item) => {
    updateShowItem(item);
  });

  // listen for new items
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type !== "childList") continue;
      for (const addedNode of mutation.addedNodes) {
        if (!addedNode.classList.contains("shows-list-item")) continue;
        updateShowItem(addedNode);
      }
    }
  });
  observer.observe(showListContainer, { childList: true });
}

window.addEventListener(
  "load",
  function load(e) {
    window.removeEventListener("load", load, false);
    this.setTimeout(() => {
      run();
    }, 2000);
  },
  false
);
