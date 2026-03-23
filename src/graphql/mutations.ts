export const CREATE_LIST_MUTATION = `
  mutation CreateList($name: String!, $description: String) {
    createUserList(input: { name: $name, description: $description }) {
      list {
        id
        name
      }
    }
  }
`;

export const ADD_REPOS_TO_LIST_MUTATION = `
  mutation AddReposToList($listId: ID!, $repositoryIds: [ID!]!) {
    addStarredRepositoriesToUserList(input: {
      userListId: $listId
      starrableIds: $repositoryIds
    }) {
      userList {
        id
        name
      }
    }
  }
`;
