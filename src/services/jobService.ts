import { Response } from "express";
import { DownloadResult } from "../types";

// Map to store job results
const jobs = new Map<string, DownloadResult[]>();
const clientsByJobId = new Map<string, Response[]>();

export class JobService {
    static createJob(jobId: string): void {
        jobs.set(jobId, []);
    }

    static addResult(jobId: string, result: DownloadResult): void {
        const jobResults = jobs.get(jobId) || [];
        jobResults.push(result);
        jobs.set(jobId, jobResults);
    }

    static getResults(jobId: string): DownloadResult[] {
        return jobs.get(jobId) || [];
    }

    static addClient(jobId: string, res: Response): void {
        if (!clientsByJobId.has(jobId)) {
            clientsByJobId.set(jobId, []);
        }
        clientsByJobId.get(jobId)!.push(res);
    }

    static removeClient(jobId: string, res: Response): void {
        const remaining = (clientsByJobId.get(jobId) || []).filter(r => r !== res);
        clientsByJobId.set(jobId, remaining);
    }

    static getClients(jobId: string): Response[] {
        return clientsByJobId.get(jobId) || [];
    }

    static deleteJob(jobId: string): void {
        clientsByJobId.delete(jobId);
    }

    static notifyClients(jobId: string, data: any, event?: string): void {
        const clients = this.getClients(jobId);
        const message = event 
            ? `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
            : `data: ${JSON.stringify(data)}\n\n`;
        
        for (const res of clients) {
            res.write(message);
        }
    }

    static endClients(jobId: string): void {
        const clients = this.getClients(jobId);
        for (const res of clients) {
            res.end();
        }
    }

    static hasAnySuccess(jobId: string): boolean {
        const results = this.getResults(jobId);
        return results.some(r => r.success);
    }

    static waitForClient(jobId: string, maxWaitMs: number = 5000): Promise<void> {
        return new Promise((resolve) => {
            const intervalMs = 100;
            let waited = 0;
            
            const checkInterval = setInterval(() => {
                waited += intervalMs;
                if (this.getClients(jobId).length > 0 || waited >= maxWaitMs) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, intervalMs);
        });
    }
} 