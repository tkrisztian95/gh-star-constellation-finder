export const STARRED_REPOSITORIES_QUERY = `
  query StarredRepositories($cursor: String) {
    viewer {
      starredRepositories(first: 100, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          name
          owner {
            login
          }
          description
          primaryLanguage {
            name
          }
          isArchived
          stargazerCount
          repositoryTopics(first: 20) {
            nodes {
              topic {
                name
              }
            }
          }
        }
      }
    }
  }
`;

export const USER_LISTS_QUERY = `
  query UserLists {
    viewer {
      lists(first: 100) {
        nodes {
          id
          name
          description
          items(first: 100) {
            nodes {
              ... on Repository {
                id
              }
            }
          }
        }
      }
    }
  }
`;
