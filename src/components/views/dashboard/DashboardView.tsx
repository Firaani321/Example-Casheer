'use client';
import React, { useState, useEffect, useCallback } from 'react';
import OverviewCards from '@/components/dashboard/overview-cards';
import TurnoverChart from '@/components/dashboard/turnover-chart';
import CategoryChart from '@/components/dashboard/category-chart';
import { getProjects, getCustomers, getExpenses, getCustomerPayments, getPartnerPayments, getPartnerReceivables, getPartnerReceivablePayments } from '@/lib/data-service';
import type { Project, Customer, Expense, CustomerPayment, PartnerPayment, PartnerReceivable, PartnerReceivablePayment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Loading from '@/components/ui/Loading';

export default function DashboardView() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [partnerPayments, setPartnerPayments] = useState<PartnerPayment[]>([]);
  const [partnerReceivables, setPartnerReceivables] = useState<PartnerReceivable[]>([]);
  const [partnerReceivablePayments, setPartnerReceivablePayments] = useState<PartnerReceivablePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        projectData, 
        customerData, 
        expenseData, 
        customerPaymentData,
        partnerPaymentData,
        partnerReceivableData,
        partnerReceivablePaymentData,
      ] = await Promise.all([
        getProjects(),
        getCustomers(),
        getExpenses(),
        getCustomerPayments(),
        getPartnerPayments(),
        getPartnerReceivables(),
        getPartnerReceivablePayments(),
      ]);
      setProjects(projectData);
      setCustomers(customerData);
      setExpenses(expenseData);
      setCustomerPayments(customerPaymentData);
      setPartnerPayments(partnerPaymentData);
      setPartnerReceivables(partnerReceivableData);
      setPartnerReceivablePayments(partnerReceivablePaymentData);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.';
      toast({
        variant: 'destructive',
        title: 'Gagal memuat data dashboard',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-4 md:gap-8 ">
      <div className='overflow-hidden'>
      <OverviewCards 
        projects={projects} 
        customers={customers} 
        expenses={expenses}
        customerPayments={customerPayments}
        partnerPayments={partnerPayments}
        partnerReceivables={partnerReceivables}
        partnerReceivablePayments={partnerReceivablePayments}
        />
        </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        <TurnoverChart customerPayments={customerPayments} expenses={expenses} partnerPayments={partnerPayments} partnerReceivablePayments={partnerReceivablePayments} />
        <CategoryChart projects={projects} />
      </div>
    </div>
  );
}