
import type { Project, Customer, Expense, Partner, PaymentType, Handler, Category, CustomerPayment, PartnerPayment, PartnerReceivable, DropdownData, PartnerReceivablePayment } from './types';
import { v4 as uuidv4 } from 'uuid';

// --- Environment Check ---
const isTauri = () => typeof window !== 'undefined' && (window as any).db;

interface ExtendedWindow extends Window {
  db: {
    read: () => Promise<any>;
    write: (data: any) => Promise<void>;
  };
}

declare const window: ExtendedWindow;

// --- DB Access Functions ---
const readDb = () => {
    if (!isTauri()) {
        console.warn("Tauri environment not detected. Returning mock empty DB.");
        return Promise.resolve({});
    }
    return window.db.read();
};

const writeDb = (data: any) => {
    if (!isTauri()) {
        console.warn("Tauri environment not detected. Write operation is mocked.");
        return Promise.resolve();
    }
    return window.db.write(data);
};

// --- Generic Functions ---

export const getTableData = async <T>(tableName: string): Promise<T[]> => {
    if (!isTauri()) return Promise.resolve([]);
    const db = await readDb();
    return (db[tableName] || []) as T[];
};

export const prefetchData = async () => {
    console.log("Prefetch data is not needed in IPC architecture.");
    return Promise.resolve();
};

const addItem = async <T extends {id: string, created_at: string}>(tableName: string, itemData: Omit<T, 'id'>): Promise<T> => {
    const newItem: T = {
        ...itemData,
        id: uuidv4(),
        created_at: (itemData as any).created_at || new Date().toISOString(),
    } as T;

    if (!isTauri()) {
        console.warn(`Mock Add: Item added to ${tableName} in memory only.`, newItem);
        return Promise.resolve(newItem);
    }
    
    const db = await readDb();
    if (!db[tableName]) db[tableName] = [];
    (db[tableName] as T[]).push(newItem);
    await writeDb(db);
    return newItem;
};

const addMultipleItems = async <T extends {id: string, created_at: string}>(tableName: string, itemsData: Omit<T, 'id'>[]): Promise<T[]> => {
    const newItems: T[] = itemsData.map(itemData => ({
        ...itemData,
        id: uuidv4(),
        created_at: (itemData as any).created_at || new Date().toISOString(),
    })) as T[];

    if (!isTauri()) {
        console.warn(`Mock Add: ${newItems.length} items added to ${tableName} in memory only.`);
        return Promise.resolve(newItems);
    }
    
    const db = await readDb();
    if (!db[tableName]) db[tableName] = [];
    (db[tableName] as T[]).push(...newItems);
    await writeDb(db);
    return newItems;
};

const updateItem = async <T extends {id: string}>(tableName: string, itemId: string, updates: Partial<T>): Promise<T> => {
    if (!isTauri()) {
        console.warn(`Mock Update: Update for ${itemId} in ${tableName} is mocked.`);
        const mockOriginalItem = { id: itemId } as T;
        return Promise.resolve({ ...mockOriginalItem, ...updates });
    }

    const db = await readDb();
    if (!db[tableName]) throw new Error(`Table ${tableName} not found.`);
    const table = db[tableName] as T[];
    const index = table.findIndex((item) => item.id === itemId);
    if (index > -1) {
        table[index] = { ...table[index], ...updates };
        await writeDb(db);
        return table[index];
    }
    throw new Error(`Item ${itemId} not found in ${tableName}.`);
};

const deleteItem = async (tableName: string, itemId: string): Promise<void> => {
    if (!isTauri()) {
        console.warn(`Mock Delete: Deletion of ${itemId} from ${tableName} is mocked.`);
        return Promise.resolve();
    }

    const db = await readDb();
    if (!db[tableName]) return;
    db[tableName] = (db[tableName] as any[]).filter((item: { id: string }) => item.id !== itemId);
    await writeDb(db);
};

// --- Specific Functions ---

// Projects
export const getProjects = async (): Promise<Project[]> => {
  const projects = await getTableData<any>('projects');
  // Backward compatibility layer
  return projects.map(p => {
    if (p.handler_id && !p.handler_ids) {
      return { ...p, handler_ids: [p.handler_id] };
    }
    return p;
  });
};
export const addProject = (projectData: Omit<Project, 'id' | 'user_id' | 'handler_id'>) => addItem<Project>('projects', { ...projectData, user_id: '' });
export const updateProject = (projectId: string, updates: Partial<Project>) => updateItem<Project>('projects', projectId, updates);
export const deleteProject = async (projectId: string): Promise<void> => {
    if (!isTauri()) {
        console.warn(`Mock Delete: Deletion of project ${projectId} is mocked.`);
        return Promise.resolve();
    }
    const db = await readDb();
    db.projects = db.projects.filter((project: Project) => project.id !== projectId);
    db.customer_payments = db.customer_payments.filter((payment: CustomerPayment) => payment.project_id !== projectId);
    db.partner_payments = db.partner_payments.filter((payment: PartnerPayment) => payment.project_id !== projectId);
    db.expenses = db.expenses.filter((expense: Expense) => expense.project_id !== projectId);
    await writeDb(db);
};

// Customers
export const getCustomers = () => getTableData<Customer>('customers');
export const addCustomer = (customerData: Omit<Customer, 'id' | 'created_at'>) => addItem<Customer>('customers', customerData);
export const updateCustomer = (customerId: string, updates: Partial<Customer>) => updateItem<Customer>('customers', customerId, updates);
export const deleteCustomer = (customerId: string) => deleteItem('customers', customerId);

// Expenses
export const getExpenses = () => getTableData<Expense>('expenses');
export const addExpense = (expenseData: Omit<Expense, 'id' | 'created_at'>) => addItem<Expense>('expenses', expenseData);
export const addMultipleExpenses = (expensesData: Omit<Expense, 'id' | 'created_at'>[]) => addMultipleItems<Expense>('expenses', expensesData);
export const deleteExpense = (expenseId: string) => deleteItem('expenses', expenseId);

// Customer Payments
export const getCustomerPayments = () => getTableData<CustomerPayment>('customer_payments');
export const addCustomerPayment = (paymentData: Omit<CustomerPayment, 'id'>) => addItem<CustomerPayment>('customer_payments', paymentData);

// Partner Receivable Payments
export const getPartnerReceivablePayments = () => getTableData<PartnerReceivablePayment>('partner_receivable_payments');
export const addPartnerReceivablePayment = (paymentData: Omit<PartnerReceivablePayment, 'id' | 'created_at'>) => addItem<PartnerReceivablePayment>('partner_receivable_payments', paymentData);

// Partner Payments
export const getPartnerPayments = () => getTableData<PartnerPayment>('partner_payments');
export const addPartnerPayment = (paymentData: Omit<PartnerPayment, 'id' | 'created_at'>) => addItem<PartnerPayment>('partner_payments', paymentData);
export const deletePartnerPayment = async (paymentId: string, expenseId: string): Promise<void> => {
     if (!isTauri()) {
        console.warn(`Mock Delete: Deletion of partner payment ${paymentId} is mocked.`);
        return Promise.resolve();
    }
    const db = await readDb();
    db.partner_payments = db.partner_payments.filter((payment: PartnerPayment) => payment.id !== paymentId);
    db.expenses = db.expenses.filter((expense: Expense) => expense.id !== expenseId);
    await writeDb(db);
}

export const deletePartnerDebt = async (projectId: string, partnerId: string): Promise<void> => {
     if (!isTauri()) {
        console.warn(`Mock Delete: Deletion of partner debt for project ${projectId} is mocked.`);
        return Promise.resolve();
    }
    const db = await readDb();
    db.partner_payments = db.partner_payments.filter((payment: PartnerPayment) => !(payment.project_id === projectId && payment.partner_id === partnerId));
    db.expenses = db.expenses.filter((expense: Expense) => !(expense.project_id === projectId && expense.partner_id === partnerId));
    await writeDb(db);
}

// Partner Receivables
export const getPartnerReceivables = () => getTableData<PartnerReceivable>('partner_receivables');
export const addPartnerReceivable = (receivableData: Omit<PartnerReceivable, 'id' | 'created_at'>) => addItem<PartnerReceivable>('partner_receivables', receivableData);
export const deletePartnerReceivable = (receivableId: string) => deleteItem('partner_receivables', receivableId);
export const updatePartnerReceivable = (receivableId: string, updates: Partial<PartnerReceivable>) => updateItem<PartnerReceivable>('partner_receivables', receivableId, updates);

// Dropdown Data
export const getDropdownData = (tableName: 'partners' | 'payment_types' | 'handlers' | 'categories' | 'customers') => getTableData<DropdownData>(tableName);
export const addDropdownData = (tableName: 'partners' | 'payment_types' | 'handlers' | 'categories', itemData: Omit<DropdownData, 'id' | 'created_at'>) => addItem<DropdownData>(tableName, itemData);
export const deleteDropdownData = (tableName: string, itemId: string) => deleteItem(tableName, itemId);

// --- Danger Zone ---
export const clearLocalDatabase = async (): Promise<void> => {
    if (!isTauri()) {
        console.warn("Mock Clear: Database clearing is mocked.");
        return Promise.resolve();
    }
    const emptyDb = {
        projects: [],
        customers: [],
        expenses: [],
        partner_payments: [],
        partner_receivables: [],
        customer_payments: [],
        partner_receivable_payments: [],
        partners: [],
        payment_types: [],
        handlers: [],
        categories: [],
    };
    await writeDb(emptyDb);
};
