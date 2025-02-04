import { configureStore } from '@reduxjs/toolkit'
import userInfoReducer from "./userInfoSlice"
import resolutionReducer from "./resolutionSlice"
import userOnlineStateReducer from "./userOnlineStateSlice"

// creates a Redux store
const store = configureStore({
  reducer: {
    // slice(state): reducer
    userInfo: userInfoReducer,
    resolution: resolutionReducer,
    userOnlineState: userOnlineStateReducer
  },
})

export default store

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch