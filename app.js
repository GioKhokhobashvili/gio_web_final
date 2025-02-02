class MovieApp {
  constructor() {
    this.currentPage = 1;
    this.totalResults = 0;
    this.cachedMovies = new Map();
    this.initializeYearFilter();
    this.setupEventListeners();
    this.fetchMovies();
  }

  initializeYearFilter() {
    const yearFilter = document.getElementById("year-filter");
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1900; year--) {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearFilter.appendChild(option);
    }
  }

  setupEventListeners() {
    const debounce = (fn, delay) => {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
      };
    };

    document.getElementById("search").addEventListener(
      "input",
      debounce(() => this.resetAndFetch(), 500)
    );

    document
      .getElementById("type-filter")
      .addEventListener("change", () => this.resetAndFetch());

    document
      .getElementById("year-filter")
      .addEventListener("change", () => this.resetAndFetch());

    document.getElementById("rating-min").addEventListener(
      "input",
      debounce(() => this.filterByRating(), 300)
    );

    document.getElementById("rating-max").addEventListener(
      "input",
      debounce(() => this.filterByRating(), 300)
    );

    document
      .getElementById("prev-page")
      .addEventListener("click", () => this.changePage(-1));

    document
      .getElementById("next-page")
      .addEventListener("click", () => this.changePage(1));

    document
      .getElementById("close-modal")
      .addEventListener("click", () => this.closeModal());

    document.getElementById("movie-modal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("movie-modal")) {
        this.closeModal();
      }
    });
  }

  resetAndFetch() {
    this.currentPage = 1;
    this.fetchMovies();
  }

  async fetchMovies() {
    const searchQuery = document.getElementById("search").value || "star";
    const year = document.getElementById("year-filter").value;
    const type = document.getElementById("type-filter").value;

    try {
      const response = await fetch(
        `${CONFIG.BASE_URL}?apikey=${CONFIG.API_KEY}&s=${searchQuery}` +
          `${year ? `&y=${year}` : ""}${type ? `&type=${type}` : ""}` +
          `&page=${this.currentPage}`
      );
      const data = await response.json();

      if (data.Response === "True") {
        this.totalResults = parseInt(data.totalResults);
        await this.processAndDisplayMovies(data.Search);
      } else {
        this.showMessage("No movies found");
      }
      this.updatePagination();
    } catch (error) {
      this.showMessage("Error loading movies. Please try again later.");
    }
  }

  async processAndDisplayMovies(movies) {
    const processedMovies = await Promise.all(
      movies.map(async (movie) => {
        if (!this.cachedMovies.has(movie.imdbID)) {
          const details = await this.fetchMovieDetails(movie.imdbID);
          this.cachedMovies.set(movie.imdbID, details);
        }
        return this.cachedMovies.get(movie.imdbID);
      })
    );

    this.displayMovies(this.filterMoviesByRating(processedMovies));
  }

  filterMoviesByRating(movies) {
    const minRating =
      parseFloat(document.getElementById("rating-min").value) || 0;
    const maxRating =
      parseFloat(document.getElementById("rating-max").value) || 10;

    return movies.filter((movie) => {
      const rating = parseFloat(movie.imdbRating);
      return !isNaN(rating) && rating >= minRating && rating <= maxRating;
    });
  }

  async fetchMovieDetails(imdbID) {
    try {
      const response = await fetch(
        `${CONFIG.BASE_URL}?apikey=${CONFIG.API_KEY}&i=${imdbID}&plot=full`
      );
      return await response.json();
    } catch (error) {
      console.error("Error fetching movie details:", error);
      return null;
    }
  }

  displayMovies(movies) {
    const movieGrid = document.getElementById("movie-grid");
    movieGrid.innerHTML = "";

    movies.forEach((movie) => {
      const movieCard = document.createElement("div");
      movieCard.className = "movie-card";
      const posterUrl =
        movie.Poster !== "N/A" ? movie.Poster : CONFIG.PLACEHOLDER_IMG;

      movieCard.innerHTML = `
            <img src="${posterUrl}" alt="${movie.Title}">
            <div class="movie-info">
                <h3>${movie.Title}</h3>
                <div class="rating">
                    ⭐ ${movie.imdbRating}
                    <span style="color: var(--text-secondary)">(${movie.Year})</span>
                </div>
            </div>
        `;

      movieCard.addEventListener("click", () => this.openModal(movie));
      movieGrid.appendChild(movieCard);
    });
  }

  openModal(movie) {
    const modal = document.getElementById("movie-modal");
    const movieDetails = document.getElementById("movie-details");
    const posterUrl =
      movie.Poster !== "N/A" ? movie.Poster : CONFIG.PLACEHOLDER_IMG;

    movieDetails.innerHTML = `
        <img src="${posterUrl}" alt="${movie.Title}">
        <div class="movie-details-info">
            <h2>${movie.Title}</h2>
            <p><strong>Year:</strong> ${movie.Year}</p>
            <p><strong>Rating:</strong> ⭐ ${movie.imdbRating} (${
      movie.imdbVotes
    } votes)</p>
            <p><strong>Genre:</strong> ${movie.Genre}</p>
            <p><strong>Director:</strong> ${movie.Director}</p>
            <p><strong>Writers:</strong> ${movie.Writer}</p>
            <p><strong>Actors:</strong> ${movie.Actors}</p>
            <p><strong>Awards:</strong> ${movie.Awards}</p>
            <p><strong>Runtime:</strong> ${movie.Runtime}</p>
            <p><strong>Released:</strong> ${movie.Released}</p>
            <p><strong>Box Office:</strong> ${movie.BoxOffice || "N/A"}</p>
            <p><strong>Plot:</strong> ${movie.Plot}</p>
        </div>
    `;

    modal.style.display = "block";
    document.body.style.overflow = "hidden";
  }

  closeModal() {
    const modal = document.getElementById("movie-modal");
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }

  updatePagination() {
    const prevButton = document.getElementById("prev-page");
    const nextButton = document.getElementById("next-page");
    const pageInfo = document.getElementById("page-info");
    const totalPages = Math.ceil(this.totalResults / CONFIG.ITEMS_PER_PAGE);

    prevButton.disabled = this.currentPage === 1;
    nextButton.disabled = this.currentPage >= totalPages;
    pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
  }

  changePage(delta) {
    const newPage = this.currentPage + delta;
    const totalPages = Math.ceil(this.totalResults / CONFIG.ITEMS_PER_PAGE);

    if (newPage >= 1 && newPage <= totalPages) {
      this.currentPage = newPage;
      this.fetchMovies();
    }
  }

  filterByRating() {
    const movies = Array.from(this.cachedMovies.values());
    this.displayMovies(this.filterMoviesByRating(movies));
  }

  showMessage(message) {
    const movieGrid = document.getElementById("movie-grid");
    movieGrid.innerHTML = `<div class="loading">${message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new MovieApp();
});
