export const initialTradeReviewState = { selectedTrade: null, isOpen: false };

export function tradeReviewReducer(state, action) {
  switch (action.type) {
    case "open":
      return { selectedTrade: action.trade, isOpen: Boolean(action.trade) };
    case "close":
      return initialTradeReviewState;
    case "update":
      return state.selectedTrade?.id === action.trade?.id
        ? { ...state, selectedTrade: action.trade }
        : state;
    default:
      return state;
  }
}
