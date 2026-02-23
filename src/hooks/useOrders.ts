import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  fetchOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  archiveOrder as archiveOrderService,
} from '../services/orders';
import { playOrderArchive, playOrderPending, playOrderComplete, playTrash } from '../utils/sounds';
import type { Order, OrderStatus } from '../types';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOrders();
      setOrders(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => load(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const addOrder = useCallback(
    async (order: Omit<Order, 'id' | 'created_at' | 'updated_at'>) => {
      await createOrder(order);
      await load();
    },
    [load],
  );

  const editOrder = useCallback(
    async (id: string, updates: Partial<Omit<Order, 'id' | 'created_at'>>) => {
      await updateOrder(id, updates);
      await load();
    },
    [load],
  );

  const changeStatus = useCallback(async (id: string, status: OrderStatus) => {
    await updateOrderStatus(id, status);
    await load();
    if (status === 'In Progress') playOrderPending();
    else if (status === 'Complete') playOrderComplete();
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await deleteOrder(id);
    await load();
    playTrash();
  }, [load]);

  const archiveOrder = useCallback(async (id: string) => {
    await archiveOrderService(id);
    await load();
    playOrderArchive();
  }, [load]);

  const ordersByStatus = (status: OrderStatus) =>
    orders.filter((o) => o.status === status);

  return {
    orders,
    loading,
    error,
    refresh: load,
    addOrder,
    editOrder,
    changeStatus,
    remove,
    archiveOrder,
    ordersByStatus,
  };
}
