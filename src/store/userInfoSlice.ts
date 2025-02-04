import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { UserInfo } from '../api/user'

const getUserInfoFromLocalStorage = () => {
    const data = localStorage.getItem('userInfo')
    if(!data) return null
    return JSON.parse(data)
}

// 初始值
const initialValue: UserInfo | null = getUserInfoFromLocalStorage()

const userInfoSlice = createSlice({
  name: 'userInfo',
  initialState: {
    value: initialValue
  },
  reducers: {
    // 指定 payload的类型
    setUserInfo: (state, action: PayloadAction<UserInfo>) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library.
      // Also, no return statement is required from these functions.
      state.value = action.payload
    },
    clearUserInfo: (state) => {
      state.value = null
    }
  },
})

// Export the action creators
export const { setUserInfo, clearUserInfo } = userInfoSlice.actions

// Export the slice reducer 
export default userInfoSlice.reducer