import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getTransactions,
    createTransaction,
    deleteTransaction,
} from "../../api/transactionsApi";
import { getCategories } from "../../api/categoriesApi";
import TransactionForm from "./TransactionForm";
import TransactionList from "./TransactionList";
import TransactionFilters from "./TransactionFilters";
import Summary from "./Summary";
import { format } from "date-fns";
import { Line, Pie } from "react-chartjs-2"; // Import chart.js components
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

// Register chart.js components for Line and Pie charts
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement // Register ArcElement for Pie Chart
);

export const TransactionManager: React.FC = () => {
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        filter: "all",
        sort: "date",
        order: "desc",
        page: 1,
    });

    // Fetch transactions with filters
    const {
        data: transactionsData,
        isLoading: isLoadingTransactions,
        isError: isTransactionsError,
    } = useQuery(["transactions", filters], () => getTransactions(filters), {
        keepPreviousData: true,
    });

    // Fetch categories
    const {
        data: categories = [],
        isLoading: isLoadingCategories,
        isError: isCategoriesError,
    } = useQuery(["categories"], getCategories);

    // Create transaction mutation
    const createMutation = useMutation(createTransaction, {
        onSuccess: () => {
            queryClient.invalidateQueries(["transactions"]);
            setError(null);
        },
        onError: (error: any) => {
            setError(error.response?.data?.error || "Failed to create transaction");
        },
    });

    // Delete transaction mutation
    const deleteMutation = useMutation(deleteTransaction, {
        onSuccess: () => {
            queryClient.invalidateQueries(["transactions"]);
            setError(null);
        },
        onError: (error: any) => {
            setError(error.response?.data?.error || "Failed to delete transaction");
        },
    });

    const handleCreateTransaction = (values: {
        type: "income" | "expense";
        category: string;
        amount: number;
        date: string;
        description?: string;
    }) => {
        createMutation.mutate(values);
    };

    const handleDeleteTransaction = (id: string) => {
        if (window.confirm("Are you sure you want to delete this transaction?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleFilterChange = (newFilters: any) => {
        setFilters((prev) => ({
            ...prev,
            ...newFilters,
            page: 1, // Reset page when filters change
        }));
    };

    if (isTransactionsError || isCategoriesError) {
        return <div className="error">Error loading data</div>;
    }

    const isLoading =
        isLoadingTransactions ||
        isLoadingCategories ||
        createMutation.isLoading ||
        deleteMutation.isLoading;

    // Chart.js data preparation for expenses and income
    const expenseData = transactionsData?.transactions?.filter(
        (transaction) => transaction.type === "expense"
    );
    const incomeData = transactionsData?.transactions?.filter(
        (transaction) => transaction.type === "income"
    );
    const expenseDates = expenseData?.map((transaction) =>
        format(new Date(transaction.date), "dd/MM/yyyy")
    );
    const expenseAmounts = expenseData?.map((transaction) => transaction.amount);
    const incomeAmounts = incomeData?.map((transaction) => transaction.amount);

    // Line Chart Data
    const chartData = {
        labels: expenseDates, // Dates for the x-axis
        datasets: [
            {
                label: "Expenses",
                data: expenseAmounts, // Amounts for the y-axis
                borderColor: "rgba(255, 99, 132, 1)",
                backgroundColor: "rgba(255, 99, 132, 0.2)",
                tension: 0.1,
            },
            {
                label: "Income",
                data: incomeAmounts, // Amounts for the y-axis
                borderColor: "rgb(10, 99, 59)",
                backgroundColor: "rgba(5, 58, 34, 0.2)",
                tension: 0.1,
            },
        ],
    };

    // Pie Chart Data (Total income vs total expenses)
    const totalIncome = incomeData?.reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalExpense = expenseData?.reduce((sum, transaction) => sum + transaction.amount, 0);

// Group expenses by category
const expenseCategories = expenseData?.reduce((acc: any, transaction) => {
    console.log(transaction.category.name);
    
    if (!acc[transaction.category.name]) {
        acc[transaction.category.name] = 0;
    }
    acc[transaction.category.name] += transaction.amount;
    console.log(acc);
    
    return acc;
}, {});

// Prepare data for the pie chart
const expenseCategoriesLabels = Object.keys(expenseCategories || {});
const expenseCategoriesAmounts = Object.values(expenseCategories || {});

// Pie Chart Data (Categories of Expenses)
const pieChartData = {
    labels: expenseCategoriesLabels, // Categories as labels
    datasets: [
        {
            data: expenseCategoriesAmounts, // Amounts for each category
            backgroundColor: [
                "#f44336", "#2196F3", "#FFEB3B", "#9C27B0", "#FF9800", 
                "#4CAF50", "#795548", "#E91E63", "#00BCD4", "#8BC34A"
            ], // Different colors for each category
            hoverBackgroundColor: [
                "#e53935", "#1976D2", "#FBC02D", "#7B1FA2", "#F57C00",
                "#388E3C", "#6D4C41", "#D81B60", "#0097A7", "#7CB342"
            ],
        },
    ],
};

    return (
        <div className="transaction-manager">
            {error && <div className="error-message">{error}</div>}

            <div className="section">
                <h2>Summary</h2>
                <Summary transactions={transactionsData?.transactions || []} />
            </div>

            <div className="section">
                <h2>Add Transaction</h2>
                <TransactionForm
                    categories={categories}
                    onSubmit={handleCreateTransaction}
                    isLoading={isLoading}
                />
            </div>

            <div className="section">
                <h2>Transactions</h2>
                <TransactionFilters
                    onFilterChange={handleFilterChange}
                    isLoading={isLoading}
                />
                <TransactionList
                    transactions={transactionsData?.transactions || []}
                    onDelete={handleDeleteTransaction}
                    isLoading={isLoading}
                />
                {transactionsData?.pagination && (
                    <div className="pagination">
                        <button
                            onClick={() =>
                                setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
                            }
                            disabled={
                                isLoading || transactionsData.pagination.page <= 1
                            }
                        >
                            Previous
                        </button>
                        <span>
                            Page {transactionsData.pagination.page} of{" "}
                            {transactionsData.pagination.totalPages}
                        </span>
                        <button
                            onClick={() =>
                                setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                            }
                            disabled={
                                isLoading ||
                                transactionsData.pagination.page >=
                                transactionsData.pagination.totalPages
                            }
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Expense Line Chart */}
            <div className="section">
                <h2>Charts</h2>
                <div className="charts-container">
                    {/* Expense Line Chart */}
                    <div className="chart-container">
                        <h3>Expenses Chart</h3>
                        <Line data={chartData} />
                    </div>

                    {/* Income vs Expense Pie Chart */}
                    <div className="pie-chart-container">
                        <h3>Category-Wise Expense</h3>
                        <Pie data={pieChartData} />
                    </div>
                </div>
            </div>

        </div>
    );
};

export default TransactionManager;
