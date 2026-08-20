const form = document.querySelector("#searchForm");
const input = document.querySelector("#usernameInput");
const statusCard = document.querySelector("#statusCard");
const profileGrid = document.querySelector("#profileGrid");
const repoSort = document.querySelector("#repoSort");
const repoList = document.querySelector("#repoList");

let currentRepos = [];

const profileFields = {
  avatar: document.querySelector("#avatar"),
  username: document.querySelector("#username"),
  name: document.querySelector("#name"),
  bio: document.querySelector("#bio"),
  repoCount: document.querySelector("#repoCount"),
  followers: document.querySelector("#followers"),
  following: document.querySelector("#following"),
  location: document.querySelector("#location"),
  company: document.querySelector("#company"),
  website: document.querySelector("#website"),
  joined: document.querySelector("#joined"),
  profileLink: document.querySelector("#profileLink"),
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = input.value.trim();

  if (!username) {
    showStatus("Please enter a GitHub username.", "warn");
    profileGrid.classList.add("hidden");
    return;
  }

  await findProfile(username);
});

repoSort.addEventListener("change", () => {
  renderRepos(sortRepos(currentRepos, repoSort.value));
});

async function findProfile(username) {
  showStatus("Searching GitHub profile...");
  profileGrid.classList.add("hidden");

  try {
    const [profileResponse, reposResponse] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}`),
      fetch(
        `https://api.github.com/users/${encodeURIComponent(
          username
        )}/repos?per_page=30&sort=updated`
      ),
    ]);

    if (profileResponse.status === 404) {
      throw new Error("User not found. Check the username and try again.");
    }

    if (profileResponse.status === 403 || reposResponse.status === 403) {
      throw new Error("GitHub API limit reached. Please try again later.");
    }

    if (!profileResponse.ok || !reposResponse.ok) {
      throw new Error("Something went wrong while fetching data.");
    }

    const profile = await profileResponse.json();
    currentRepos = await reposResponse.json();

    renderProfile(profile);
    renderRepos(sortRepos(currentRepos, repoSort.value));
    statusCard.classList.add("hidden");
    profileGrid.classList.remove("hidden");
  } catch (error) {
    showStatus(error.message, "error");
  }
}

function renderProfile(profile) {
  profileFields.avatar.src = profile.avatar_url;
  profileFields.avatar.alt = `${profile.login}'s GitHub avatar`;
  profileFields.username.textContent = `@${profile.login}`;
  profileFields.name.textContent = profile.name || profile.login;
  profileFields.bio.textContent = profile.bio || "No bio added yet.";
  profileFields.repoCount.textContent = formatNumber(profile.public_repos);
  profileFields.followers.textContent = formatNumber(profile.followers);
  profileFields.following.textContent = formatNumber(profile.following);
  profileFields.location.textContent = profile.location || "Not available";
  profileFields.company.textContent = profile.company || "Not available";
  profileFields.joined.textContent = formatDate(profile.created_at);
  profileFields.profileLink.href = profile.html_url;

  if (profile.blog) {
    const websiteUrl = profile.blog.startsWith("http")
      ? profile.blog
      : `https://${profile.blog}`;
    profileFields.website.href = websiteUrl;
    profileFields.website.textContent = profile.blog;
  } else {
    profileFields.website.removeAttribute("href");
    profileFields.website.textContent = "Not available";
  }
}

function renderRepos(repos) {
  if (!repos.length) {
    repoList.innerHTML = '<p class="repo-description">No public repositories found.</p>';
    return;
  }

  repoList.innerHTML = repos
    .slice(0, 8)
    .map(
      (repo) => `
        <article class="repo-card">
          <a href="${repo.html_url}" target="_blank" rel="noreferrer">${escapeHtml(
        repo.name
      )}</a>
          <p class="repo-description">${escapeHtml(
            repo.description || "No description available."
          )}</p>
          <div class="repo-meta">
            <span>${escapeHtml(repo.language || "Other")}</span>
            <span>Stars: ${formatNumber(repo.stargazers_count)}</span>
            <span>Forks: ${formatNumber(repo.forks_count)}</span>
            <span>Updated: ${formatDate(repo.updated_at)}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function sortRepos(repos, mode) {
  return [...repos].sort((first, second) => {
    if (mode === "stars") {
      return second.stargazers_count - first.stargazers_count;
    }

    if (mode === "forks") {
      return second.forks_count - first.forks_count;
    }

    return new Date(second.updated_at) - new Date(first.updated_at);
  });
}

function showStatus(message, type = "") {
  statusCard.textContent = message;
  statusCard.className = `status-card ${type}`.trim();
}

function formatNumber(value) {
  return new Intl.NumberFormat("en").format(value || 0);
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateValue));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
