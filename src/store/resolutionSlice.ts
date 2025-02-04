import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Resolution {
  id: string,
  width: number,
  height: number,
}

export const resolutionOptions = [
  {
    id: '1',
    width: 800,
    height: 600,
  },
  {
    id: '2',
    width: 1024,
    height: 768,
  },
  {
    id: '3',
    width: 1280,
    height: 720,
  }
]

const getResFromLocalStorage = () => {
  const id = localStorage.getItem('resolution')
  if(!id) return resolutionOptions[0]
  return getResById(id)
}

const getResById = (id: string) => {
  return resolutionOptions.find(item => item.id === id) as Resolution
}

// 初始值
const initialValue: Resolution = getResFromLocalStorage()

const resolutionSlice = createSlice({
  name: 'resolution',
  initialState: {
    value: initialValue
  },
  reducers: {
    // 指定 payload的类型
    setResolution: (state, action: PayloadAction<string>) => {
      state.value = getResById(action.payload)
    },
  },
})

// Export the action creators
export const { setResolution } = resolutionSlice.actions

// Export the slice reducer 
export default resolutionSlice.reducer