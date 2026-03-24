export const DELETE_USER_LIST_MUTATION = `
  mutation DeleteUserList($listId: ID!) {
    deleteUserList(input: { listId: $listId }) {
      status
    }
  }
`;

export const UPDATE_USER_LIST_MUTATION = `
  mutation UpdateUserList($listId: ID!, $name: String!, $description: String) {
    updateUserList(input: { listId: $listId, name: $name, description: $description }) {
      list {
        id
        name
      }
    }
  }
`;

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
  mutation AddReposToList($itemId: ID!, $listIds: [ID!]!) {
    updateUserListsForItem(input: {
      itemId: $itemId
      listIds: $listIds
    }) {
      lists {
        id
        name
      }
    }
  }
`;
