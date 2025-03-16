import { createSlice, PayloadAction } from '@reduxjs/toolkit'

const userOnlineStateSlice = createSlice({
  name: 'userOnlineState',
  initialState: {
    value: false
  },
  reducers: {
    // 指定 payload的类型
    setUserOnlineState: (state, action: PayloadAction<boolean>) => {
      console.log('setUserOnlineState', action.payload)
      state.value = action.payload
    },
  },
})

// Export the action creators
export const { setUserOnlineState } = userOnlineStateSlice.actions

// Export the slice reducer 
export default userOnlineStateSlice.reducer