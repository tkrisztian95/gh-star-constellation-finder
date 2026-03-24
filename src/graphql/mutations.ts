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
