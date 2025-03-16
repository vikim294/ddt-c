import { createSlice, PayloadAction } from '@reduxjs/toolkit'

const initialState: {
  value: number | null
} = {
  value: null
}

const updateTokenTimerSlice = createSlice({
  name: 'updateTokenTimer',
  initialState,
  reducers: {
    // 指定 payload的类型
    setUpdateTokenTimer: (state, action: PayloadAction<number>) => {
      state.value = action.payload
    },
  },
})

// Export the action creators
export const { setUpdateTokenTimer } = updateTokenTimerSlice.actions

// Export the slice reducer 
export default updateTokenTimerSlice.reducer