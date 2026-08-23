export const TRENDING_FIXTURE = {
  results: [
    { id: 1, title: 'Test Movie', media_type: 'movie', vote_average: 7.5, poster_path: '/test.jpg', overview: 'Test' },
    { id: 2, name: 'Test TV', media_type: 'tv', vote_average: 8.0, poster_path: '/test2.jpg', overview: 'Test TV' },
  ],
}

export const MOVIE_DETAIL_FIXTURE = {
  id: 1,
  title: 'Test Movie',
  overview: 'A test movie',
  vote_average: 7.5,
  poster_path: '/test.jpg',
  genres: [{ id: 1, name: 'Action' }],
  runtime: 120,
}

export const TV_DETAIL_FIXTURE = {
  id: 2,
  name: 'Test TV Series',
  overview: 'A test series',
  vote_average: 8.0,
  poster_path: '/test2.jpg',
  genres: [{ id: 2, name: 'Drama' }],
  seasons: [{ season_number: 1, episode_count: 10 }],
}

export const SEASON_FIXTURE = {
  episodes: [
    { episode_number: 1, name: 'Pilot', still_path: '/still1.jpg' },
    { episode_number: 2, name: 'Episode 2', still_path: '/still2.jpg' },
  ],
}

export const PROVIDERS_FIXTURE = {
  results: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.png' }] },
}