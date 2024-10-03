export interface CalculatorResult {
	initialPurchase: number;
	buyDate: string;
	buyRate: number;
	btcAmount: number;
	sellDate: string;
	sellRate: number;
	finalValue: number;
	profitLoss: number;
	percentageProfit: number;
}

export interface HistoricalDataPoint {
	date: string;
	close: number;
	return?: number;
	btcAmount?: number;
	purchase?: number;
	dailyPurchase?: number;
	profitLoss?: number;
}

// Add this to the existing types
export interface BuyInstance {
	id: string;
	amount: number;
	frequency: "daily" | "weekly" | "monthly";
	dayOfWeek?: number; // 0-6, where 0 is Sunday
	dayOfMonth?: number; // 1-31
}

export interface CompoundInterestResult {
	totalInvested: number;
	finalValue: number;
	profitLoss: number;
	percentageProfit: number;
	totalBtcBought: number;
}

export interface TimeSeriesResponse {
	disclaimer: string;
	license: string;
	start_date: string;
	end_date: string;
	base: string;
	rates: {
		[date: string]: {
			USD: number;
		};
	};
}

export interface HistoricalBar {
	t: string; // timestamp as ISO string
	c: number; // close price
}

export interface HistoricalDataResponse {
	bars: {
		"BTC/USD": HistoricalBar[];
	};
	next_page_token: string | null;
}
