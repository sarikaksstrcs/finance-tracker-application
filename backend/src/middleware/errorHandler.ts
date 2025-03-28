import { Request, Response, NextFunction } from "express";

export const errorHandler = (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    err: Error,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message });
};
