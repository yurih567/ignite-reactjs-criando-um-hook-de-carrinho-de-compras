import { createContext, ReactNode, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productToUpdate = updatedCart.find(product => product.id === productId)
      const { data } = await api.get<Stock>(`/stock/${productId}`)
      const currentAmount = productToUpdate?.amount || 0
      if (currentAmount + 1 > data.amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }
      if (productToUpdate) {
        productToUpdate.amount = currentAmount + 1
      } else {
        const { data } = await api.get<Product>(`/products/${productId}`)
        updatedCart.push({...data, amount: 1})
      }
      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch(error) {
      toast.error('Erro na adição do produto')
    }
  }

  const removeProduct = (productId: number) => {
    const productToRemove = cart.find(product => product.id === productId)
    if (! productToRemove) {
      toast.error('Erro na remoção do produto')
      return
    }

    const cartUpdated = cart.filter(product => product.id !== productId)
    setCart(cartUpdated)
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated))
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount < 1) {
      return
    }

    const updatedCart = [...cart]
    const productToUpdate = updatedCart.find(product => product.id === productId)
    if (!productToUpdate) {
      toast.error('Erro na alteração de quantidade do produto')
      return
    }

    const { data } = await api.get<Stock>(`/stock/${productId}`)
    if (amount > data.amount) {
      toast.error('Quantidade solicitada fora de estoque')
      return
    }
    productToUpdate.amount = amount
    setCart(updatedCart)
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
