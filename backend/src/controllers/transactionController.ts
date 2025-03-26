import { Request, Response } from "express";
import Transaction, { ITransaction } from "../models/Transaction";
import Category from "../models/Category";

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const user = req.user._id;
        const {
            filter = "all",
            sort = "date",
            order = "desc",
            page = 1,
            limit = 10,
            startDate,
            endDate,
        } = req.query;

        const query: any = { user };
        if (filter !== "all") {
            query.type = filter;
        }
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate as string);
            if (endDate) query.date.$lte = new Date(endDate as string);
        }

        const sortObj: any = {};
        sortObj[sort as string] = order === "asc" ? 1 : -1;

        const pageNum = parseInt(page as string, 10) || 1;
        const limitNum = parseInt(limit as string, 10) || 10;

        const [transactions, total] = await Promise.all([
            Transaction.find(query)
                .populate("category")
                .sort(sortObj)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum),
            Transaction.countDocuments(query),
        ]);

        res.json({
            transactions,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
};

export const createTransaction = async (req: Request, res: Response) => {
    try {
        const user = req.user._id;
        const { type, category, amount, date, description } = req.body;

        const categoryDoc = await Category.findOne({ _id: category, user });
        if (!categoryDoc) {
            return res.status(400).json({ error: "Invalid category or category not found" });
        }

        const newTransaction = await Transaction.create({
            user,
            type,
            category,
            amount,
            date: new Date(date),
            description,
        }) as ITransaction;

        const populatedTransaction = await Transaction.findById(newTransaction._id).populate("category");
        res.status(201).json(populatedTransaction);
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
};

export const deleteTransaction = async (req: Request, res: Response) => {
    try {
        const user = req.user._id;
        const { id } = req.params;

        const transaction = await Transaction.findOneAndDelete({ _id: id, user });
        if (!transaction) return res.status(404).json({ error: "Transaction not found" });
        res.json({ message: "Transaction deleted" });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
};

export const getTransactionStats = async (req: Request, res: Response) => {
    try {
        const user = req.user._id;
        const { startDate, endDate } = req.query;

        const dateQuery: any = {};
        if (startDate) dateQuery.$gte = new Date(startDate as string);
        if (endDate) dateQuery.$lte = new Date(endDate as string);

        const query = { user, ...(startDate || endDate ? { date: dateQuery } : {}) };

        const stats = await Transaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$type",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 },
                },
            },
        ]);

        const formattedStats = {
            income: { total: 0, count: 0 },
            expense: { total: 0, count: 0 },
        };

        stats.forEach((stat) => {
            formattedStats[stat._id as keyof typeof formattedStats] = {
                total: stat.total,
                count: stat.count,
            };
        });

        res.json({
            ...formattedStats,
            balance: formattedStats.income.total - formattedStats.expense.total,
        });
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
};
