
export type Project = {
  id: string;
  created_at: string;
  customer_id: string;
  project_name: string;
  project_details?: string;
  handler_ids: string[]; // Mengubah dari handler_id menjadi handler_ids
  project_status: 'Tertunda' | 'Dikerjakan' | 'Selesai' | 'Dibatalkan';
  unit_price: number;
  discount?: number;
  total_price: number;
  down_payment?: number;
  remaining_payment: number;
  payment_status: 'Belum Lunas' | 'Dibayar Sebagian' | 'Lunas';
  quantity: number;
  category?: string;
  form?: string;
  length?: number;
  width?: number;
  material?: string;
  weight?: number;
  size?: string;
  user_id: string; 
};

export type PartnerPayment = {
  id: string;
  created_at: string;
  project_id: string;
  partner_id: string;
  amount: number;
  description?: string;
  payment_type_id: string;
}

export type PartnerReceivable = {
  id: string;
  created_at: string;
  partner_id: string;
  amount: number;
  description: string;
  remaining_amount: number;
  status: 'Lunas' | 'Belum Lunas';
}

export type CustomerPayment = {
  id: string;
  created_at: string;
  project_id: string | null;
  payment_type_id: string;
  total_payment: number;
  amount_paid: number;
  remaining_payment: number;
  partner_receivable_id?: string | null;
};

export type PartnerReceivablePayment = {
  id: string;
  created_at: string;
  partner_receivable_id: string;
  amount_paid: number;
  payment_type_id: string;
}

export type Expense = {
  id: string;
  created_at: string;
  payment_type_id: string;
  description: string;
  total_expense_amount: number;
  project_id?: string;
  partner_id?: string;
};

export type DropdownData = {
  id: string;
  created_at: string;
  name: string;
};

export type Customer = DropdownData & {
    contact_information: string | null;
}

export type Partner = DropdownData & {
    contact_information: string | null;
}

export type PaymentType = DropdownData;

export type Handler = DropdownData;

export type Category = DropdownData;
