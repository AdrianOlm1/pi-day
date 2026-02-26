import { supabase } from '../lib/supabase';
import type { Order, OrderStatus } from '../types';

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createOrder(
  order: Omit<Order, 'id' | 'created_at' | 'updated_at'>,
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrder(
  id: string,
  updates: Partial<Omit<Order, 'id' | 'created_at'>>,
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw error;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  return updateOrder(id, { status });
}

export async function archiveOrder(id: string): Promise<Order> {
  return updateOrder(id, { archived: true, status: 'Complete' });
}
