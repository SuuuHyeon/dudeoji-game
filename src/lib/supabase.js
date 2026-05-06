import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let isMock = false
let supabase = null

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  isMock = true
  console.warn('Supabase keys not found in .env. Using LocalStorage mock for leaderboard.')
  
  // Helper to read/write mock data
  const getMockData = () => {
    const dataStr = localStorage.getItem('mock_leaderboard')
    return dataStr ? JSON.parse(dataStr) : []
  }
  const saveMockData = (data) => {
    localStorage.setItem('mock_leaderboard', JSON.stringify(data))
  }

  // Mock Supabase Client using localStorage
  supabase = {
    from: (table) => {
      if (table !== 'leaderboard') throw new Error('Mock only supports leaderboard table')
      
      return {
        select: (fields) => {
          return {
            eq: (column, value) => {
              return {
                single: () => {
                  return new Promise((resolve) => {
                    setTimeout(() => {
                      const data = getMockData()
                      const record = data.find(r => r[column] === value)
                      resolve({ data: record || null, error: null })
                    }, 200)
                  })
                }
              }
            },
            order: (column, { ascending = false } = {}) => {
              return {
                limit: (count) => {
                  return new Promise((resolve) => {
                    setTimeout(() => {
                      let data = getMockData()
                      // Sort
                      data.sort((a, b) => ascending ? a[column] - b[column] : b[column] - a[column])
                      // Limit
                      if (count) {
                        data = data.slice(0, count)
                      }
                      resolve({ data, error: null })
                    }, 200)
                  })
                }
              }
            }
          }
        },
        insert: (records) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              let data = getMockData()
              const newRecords = Array.isArray(records) ? records : [records]
              const inserted = newRecords.map(r => ({
                id: Date.now() + Math.random(),
                created_at: new Date().toISOString(),
                ...r
              }))
              
              data = [...data, ...inserted]
              saveMockData(data)
              resolve({ data: inserted, error: null })
            }, 200)
          })
        },
        update: (updates) => {
          return {
            eq: (column, value) => {
              return new Promise((resolve) => {
                setTimeout(() => {
                  let data = getMockData()
                  const index = data.findIndex(r => r[column] === value)
                  if (index !== -1) {
                    data[index] = { ...data[index], ...updates }
                    saveMockData(data)
                  }
                  resolve({ data: [data[index]], error: null })
                }, 200)
              })
            }
          }
        }
      }
    }
  }
}

export { supabase, isMock }
