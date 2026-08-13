export const DELETE_ALL_TRADES_CONFIRMATION = "DELETE ALL TRADES";

export function canConfirmDelete(value) {
  return value === DELETE_ALL_TRADES_CONFIRMATION;
}

export const initialDeleteState = { isOpen: false, isDeleting: false, result: null, error: "" };

export function deleteStateReducer(state, action) {
  switch (action.type) {
    case "open": return { ...state, isOpen: true, error: "" };
    case "cancel": return state.isDeleting ? state : { ...state, isOpen: false, error: "" };
    case "start": return state.isDeleting ? state : { ...state, isDeleting: true, error: "", result: null };
    case "success": return { isOpen: false, isDeleting: false, result: action.result, error: "" };
    case "error": return { ...state, isDeleting: false, error: action.message };
    default: return state;
  }
}
