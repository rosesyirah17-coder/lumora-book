const { createApp } = Vue;

const FAVORITES_KEY = 'lumora-favorites-v2';
const LIBRARY_KEY = 'lumora-library-v2';

function readStorage(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

createApp({
  data() {
    return {
      entered: false,
      page: 'home',
      searchText: '',
      selectedCategory: 'All Books',

      books: [],
      library: readStorage(LIBRARY_KEY),
      favorites: readStorage(FAVORITES_KEY),

      selectedBook: null,
      loading: false,
      loadingMore: false,
      toast: '',
      apiMessage: '',

      pageNumber: 1,
      lastQuery: 'children illustrated stories',
      activeCategory: 'All Books',

      fallbackCover:
        'https://placehold.co/420x600/e8eee4/657a65?text=Lumora+Book',

      categories: [
        {
          name: 'All Books',
          query: 'children illustrated stories',
          icon: '✧'
        },
        {
          name: 'Fairy Tales',
          query: 'children fairy tales classic stories',
          icon: '🧚'
        },
        {
          name: 'Animal Stories',
          query: 'children animal stories',
          icon: '🐻'
        },
        {
          name: 'Magic',
          query: 'children magic fantasy stories',
          icon: '✦'
        },
        {
          name: 'Friendship',
          query: 'children friendship stories',
          icon: '🌷'
        },
        {
          name: 'Cartoon',
          query: 'children comic books graphic novels',
          icon: '🎨'
        },
        {
          name: 'Horror',
          query: 'children gentle spooky ghost stories',
          icon: '🌙'
        },
        {
          name: 'Mystery',
          query: 'children mystery detective stories',
          icon: '🔎'
        },
        {
          name: 'Adventure',
          query: 'children adventure stories',
          icon: '🏰'
        }
      ]
    };
  },

  computed: {
    visibleBooks() {
      if (this.page === 'library') {
        return this.library;
      }

      if (this.page === 'favorites') {
        return this.favorites;
      }

      return this.books;
    }
  },

  methods: {
    // NAVIGATION

    goTo(target) {
      this.page = target;
      this.selectedBook = null;

      if (target === 'discover' && this.books.length === 0) {
        this.selectedCategory = 'All Books';
        this.loadBooks(this.categories[0].query);
      }

      if (target === 'home' && this.books.length === 0) {
        this.selectedCategory = 'All Books';
        this.loadBooks(this.categories[0].query);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    enterWebsite() {
      this.entered = true;
      this.page = 'home';
      this.selectedCategory = 'All Books';
      this.loadBooks(this.categories[0].query);
    },

    resetCollection() {
      this.selectedCategory = 'All Books';
      this.page = 'discover';
      this.pageNumber = 1;
      this.loadBooks(this.categories[0].query);
    },

    // CATEGORY

    async chooseCategory(category) {
      this.selectedCategory = category.name;
      this.activeCategory = category.name;
      this.page = 'discover';
      this.pageNumber = 1;
      this.searchText = '';

      await this.loadBooks(category.query);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // SEARCH

    async searchBooks() {
      const query = this.searchText.trim();

      if (!query) {
        this.notify('Please enter a book title or keyword.');
        return;
      }

      this.page = 'discover';
      this.selectedCategory = '';
      this.activeCategory = '';
      this.pageNumber = 1;

      await this.loadBooks(query);
    },

    // API REQUESTS
    // Original APIs retained:
    // 1. Open Library
    // 2. Google Books
    // 3. Gutendex

    async loadBooks(query, append = false) {
      if (this.loading || this.loadingMore) return;

      if (append) {
        this.loadingMore = true;
      } else {
        this.loading = true;
        this.books = [];
      }

      this.lastQuery = query;
      this.apiMessage = '';

      const page = this.pageNumber;
      const encodedQuery = encodeURIComponent(query);

      const openLibraryURL =
        `https://openlibrary.org/search.json?q=${encodedQuery}` +
        `&limit=15&page=${page}` +
        `&fields=key,title,author_name,cover_i,first_publish_year,ebook_access,has_fulltext,ia`;

      const googleBooksURL =
        `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}` +
        `&maxResults=15&startIndex=${(page - 1) * 15}&printType=books`;

      const gutendexURL =
        `https://gutendex.com/books/?search=${encodedQuery}&page=${page}`;

      try {
        const responses = await Promise.allSettled([
          fetch(openLibraryURL).then(response => {
            if (!response.ok) throw new Error('Open Library request failed');
            return response.json();
          }),

          fetch(googleBooksURL).then(response => {
            if (!response.ok) throw new Error('Google Books request failed');
            return response.json();
          }),

          fetch(gutendexURL).then(response => {
            if (!response.ok) throw new Error('Gutendex request failed');
            return response.json();
          })
        ]);

        const results = [];

        // GUTENDEX
        // Public-domain books with an HTML reading file are prioritised.

        if (responses[2].status === 'fulfilled') {
          const data = responses[2].value;

          (data.results || []).forEach(book => {
            if (!book.title) return;

            const formats = book.formats || {};

            const htmlKey = Object.keys(formats).find(key =>
              key.toLowerCase().startsWith('text/html')
            );

            const htmlURL = htmlKey ? formats[htmlKey] : null;

            const imageURL =
              formats['image/jpeg'] || this.fallbackCover;

            results.push({
              id: 'gut-' + book.id,
              title: book.title,
              author: book.authors?.map(author => author.name).join(', ')
                || 'Unknown author',
              cover: imageURL,
              description:
                'A public-domain title from Project Gutenberg.',
              source: 'Gutendex',
              readUrl: htmlURL,
              viewUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
              category: this.selectedCategory || 'Lumora Pick'
            });
          });
        }

        // GOOGLE BOOKS

        if (responses[1].status === 'fulfilled') {
          const data = responses[1].value;

          (data.items || []).forEach(book => {
            const info = book.volumeInfo || {};

            if (!info.title) return;

            const description = (info.description || '')
              .replace(/<[^>]*>/g, '')
              .replace(/\s+/g, ' ')
              .slice(0, 650);

            const thumbnail =
              info.imageLinks?.thumbnail ||
              info.imageLinks?.smallThumbnail ||
              this.fallbackCover;

            const previewURL =
              info.previewLink || null;

            results.push({
              id: 'gb-' + book.id,
              title: info.title,
              author: info.authors?.join(', ') || 'Unknown author',
              cover: thumbnail.replace('http:', 'https:'),
              description: description || 'Explore this title on Google Books.',
              source: 'Google Books',
              readUrl: previewURL,
              viewUrl: info.infoLink || previewURL ||
                'https://books.google.com',
              category: this.selectedCategory || 'Lumora Pick'
            });
          });
        }

        // OPEN LIBRARY

        if (responses[0].status === 'fulfilled') {
          const data = responses[0].value;

          (data.docs || []).forEach(book => {
            if (!book.title) return;

            const key = book.key || '';
            const archiveId = Array.isArray(book.ia)
              ? book.ia[0]
              : null;

            const hasPublicEbook =
              book.ebook_access === 'public' ||
              book.ebook_access === 'borrowable';

            let readURL = null;

            if (hasPublicEbook && archiveId) {
              readURL = `https://archive.org/details/${encodeURIComponent(archiveId)}`;
            } else if (hasPublicEbook && key) {
              readURL = `https://openlibrary.org${key}`;
            }

            results.push({
              id: 'ol-' + (key || book.title),
              title: book.title,
              author: book.author_name?.join(', ') || 'Unknown author',
              cover: book.cover_i
                ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
                : this.fallbackCover,
              description:
                `First published: ${book.first_publish_year || 'Not specified'}. ` +
                'Explore the book record and available reading options.',
              source: 'Open Library',
              readUrl: readURL,
              viewUrl: key
                ? `https://openlibrary.org${key}`
                : 'https://openlibrary.org',
              category: this.selectedCategory || 'Lumora Pick'
            });
          });
        }

        // REMOVE DUPLICATE TITLES

        const seen = new Set();

        const uniqueResults = results.filter(book => {
          const titleKey = book.title
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, ' ')
            .trim();

          if (!titleKey || seen.has(titleKey)) {
            return false;
          }

          seen.add(titleKey);
          return true;
        });

        // KEEP THE RESULTS FROM WORKING APIs

        this.books = append
          ? [...this.books, ...uniqueResults]
          : uniqueResults;

        const successCount = responses.filter(
          result => result.status === 'fulfilled'
        ).length;

        if (successCount === 0) {
          this.apiMessage =
            'The book services could not be reached right now. Please check your internet connection and try again.';
        } else if (this.books.length === 0) {
          this.apiMessage =
            'No matching books were returned. Try another search or category.';
        }

      } catch (error) {
        console.error('Lumora Book loading error:', error);

        this.apiMessage =
          'Something went wrong while loading books. Please try again.';
      } finally {
        this.loading = false;
        this.loadingMore = false;
      }
    },

    // LOAD MORE

    async loadMore() {
      if (this.loading || this.loadingMore) return;

      this.pageNumber += 1;
      await this.loadBooks(this.lastQuery, true);
    },

    // READING

    startReading(book) {
      const destination = book.readUrl || book.viewUrl;

      if (!destination) {
        this.notify('A reading link is not available for this book.');
        return;
      }

      // Open the book source in a new tab.
      window.open(destination, '_blank', 'noopener,noreferrer');

      // Save the book to the library.
      if (!this.inLibrary(book)) {
        this.toggleLibrary(book, true);
      }

      this.selectedBook = null;

      if (!book.readUrl) {
        this.notify('Opening the book information page.');
      } else {
        this.notify('Your reading journey begins here ✨');
      }
    },

    // FAVORITES

    isFavorite(book) {
      return this.favorites.some(item => item.id === book.id);
    },

    toggleFavorite(book) {
      if (this.isFavorite(book)) {
        this.favorites = this.favorites.filter(
          item => item.id !== book.id
        );

        this.notify('Removed from Favorites.');
      } else {
        this.favorites = [...this.favorites, book];
        this.notify('Added to your favourites ♡');
      }

      localStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(this.favorites)
      );
    },

    // MY LIBRARY

    inLibrary(book) {
      return this.library.some(item => item.id === book.id);
    },

    toggleLibrary(book, quiet = false) {
      if (this.inLibrary(book)) {
        this.library = this.library.filter(
          item => item.id !== book.id
        );

        if (!quiet) {
          this.notify('Removed from My Library.');
        }
      } else {
        this.library = [...this.library, book];

        if (!quiet) {
          this.notify('Saved to My Library ✨');
        }
      }

      localStorage.setItem(
        LIBRARY_KEY,
        JSON.stringify(this.library)
      );
    },

    // COVER ERROR HANDLING

    handleCoverError(event) {
      event.target.onerror = null;
      event.target.src = this.fallbackCover;
    },

    // NOTIFICATION

    notify(message) {
      this.toast = message;

      if (this.toastTimer) {
        clearTimeout(this.toastTimer);
      }

      this.toastTimer = setTimeout(() => {
        this.toast = '';
      }, 2400);
    }
  },

  mounted() {
    // Wait for the user to enter the library.
  }
}).mount('#app');