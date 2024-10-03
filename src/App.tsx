import { useState, useMemo } from "react";
import axios from "axios";
import {
	isFuture,
	format,
	getDay,
	getDate,
	endOfDay,
	startOfDay,
	parseISO,
} from "date-fns";
import { DatePicker } from "@mantine/dates";
import { Tabs, Popover, TextInput, Text, Button, Stack } from "@mantine/core";
import { v4 as uuidv4 } from "uuid";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	CartesianGrid,
	Legend,
	type TooltipProps,
} from "recharts";
import {
	DollarSign,
	Calendar,
	Bitcoin,
	TrendingUp,
	TrendingDown,
	PercentSquare,
} from "lucide-react";
import { ResultRow } from "./components/ResultRow";
import { CustomTooltip } from "./components/CustomTooltip";
import { formatAmount } from "./utils";
import { BuyInstanceInput } from "./components/BuyInstanceInput";
import type {
	BuyInstance,
	CalculatorResult,
	CompoundInterestResult,
	HistoricalDataPoint,
	HistoricalDataResponse,
	HistoricalBar,
} from "./types";
import type {
	NameType,
	ValueType,
} from "recharts/types/component/DefaultTooltipContent";

type FetchDataCallback = (bars: HistoricalBar[]) => void;

function App() {
	const [date, setDate] = useState<[Date | null, Date | null]>([null, null]);
	const [purchaseAmount, setPurchaseAmount] = useState("");
	const [result, setResult] = useState<CalculatorResult | null>(null);

	const [historicalStartDate, setHistoricalStartDate] = useState<Date | null>(
		null,
	);
	const [historicalEndDate, setHistoricalEndDate] = useState<Date | null>(null);
	const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>(
		[],
	);
	const [isHistoricalPopoverOpen, setIsHistoricalPopoverOpen] = useState(false);

	const [compoundStartDate, setCompoundStartDate] = useState<Date | null>(null);
	const [compoundEndDate, setCompoundEndDate] = useState<Date | null>(null);
	const [buyInstances, setBuyInstances] = useState<BuyInstance[]>([]);
	const [compoundResult, setCompoundResult] =
		useState<CompoundInterestResult | null>(null);
	const [compoundHistoricalData, setCompoundHistoricalData] = useState<
		HistoricalDataPoint[]
	>([]);

	const calculateProfit = async () => {
		if (!date[0] || !date[1]) {
			alert("Please select a date range");
			return;
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (isFuture(date[0]) || isFuture(date[1])) {
			alert("Please select dates up to today only");
			return;
		}

		try {
			await fetchAlpacaData(date[0], date[1], (bars) => {
				if (bars.length < 2) {
					throw new Error("Not enough data for the selected date range");
				}

				const buyBar = bars[0];
				const sellBar = bars[bars.length - 1];

				const buyRate = buyBar.c;
				const sellRate = sellBar.c;
				const btcAmount = Number.parseFloat(purchaseAmount) / buyRate;

				const initialPurchase = Number.parseFloat(purchaseAmount);
				const finalValue = btcAmount * sellRate;
				const profitLoss = finalValue - initialPurchase;
				const percentageProfit = (profitLoss / initialPurchase) * 100;

				setResult({
					initialPurchase,
					buyDate: format(parseISO(buyBar.t), "MMM dd, yyyy"),
					buyRate,
					btcAmount,
					sellDate: format(parseISO(sellBar.t), "MMM dd, yyyy"),
					sellRate,
					finalValue,
					profitLoss,
					percentageProfit,
				});
			});

			//   if (!response) {
			//     throw new Error("Failed to fetch data from Alpaca API");
			//   }
		} catch (error) {
			console.error(error);
			setResult(null);
			alert(
				"Error calculating profit/loss. Please check your inputs and try again.",
			);
		}
	};

	const maxDate = useMemo(() => new Date(), []);

	const formatDateRange = (range: [Date | null, Date | null]) => {
		if (!range[0]) return "Select date range";
		if (!range[1]) return range[0].toLocaleDateString();
		return `${range[0].toLocaleDateString()} - ${range[1].toLocaleDateString()}`;
	};

	const handleHistoricalDateChange = (date: Date | null) => {
		if (date) {
			const endDate = new Date(date);
			endDate.setMonth(endDate.getMonth() + 1);
			const today = new Date();
			const finalEndDate = endDate > today ? today : endDate;

			setHistoricalStartDate(date);
			setHistoricalEndDate(finalEndDate);
			setIsHistoricalPopoverOpen(false);
			fetchHistoricalData(date, finalEndDate);
		}
	};

	const fetchAlpacaData = async (
		startDate: Date,
		endDate: Date,
		callback: FetchDataCallback,
	) => {
		try {
			const response = await axios.get<HistoricalDataResponse>(
				"https://data.alpaca.markets/v1beta3/crypto/us/bars",
				{
					params: {
						symbols: "BTC/USD",
						timeframe: "1D",
						start: startOfDay(startDate).toISOString(),
						end: endOfDay(endDate).toISOString(),
						limit: 1000,
						sort: "asc",
					},
					headers: {
						accept: "application/json",
					},
				},
			);

			const bars = response.data.bars["BTC/USD"];
			callback(bars);
		} catch (error) {
			console.error(error);
			alert("Error fetching data. Please try again.");
		}
	};

	const fetchHistoricalData = async (startDate: Date, endDate: Date) => {
		await fetchAlpacaData(startDate, endDate, (bars) => {
			const initialPrice = bars[0].c;
			const data: HistoricalDataPoint[] = bars.map((bar) => ({
				date: bar.t,
				close: bar.c,
				high: bar.h,
				low: bar.l,
				open: bar.o,
				volume: bar.v,
				vwap: bar.vw,
				return: ((bar.c - initialPrice) / initialPrice) * 100,
			}));
			setHistoricalData(data);
		});
	};

	const addBuyInstance = () => {
		setBuyInstances([
			...buyInstances,
			{ id: uuidv4(), amount: 0, frequency: "daily" },
		]);
	};

	const updateBuyInstance = (updatedInstance: BuyInstance) => {
		setBuyInstances(
			buyInstances.map((instance) =>
				instance.id === updatedInstance.id ? updatedInstance : instance,
			),
		);
	};

	const deleteBuyInstance = (id: string) => {
		setBuyInstances(buyInstances.filter((instance) => instance.id !== id));
	};

	const calculateCompoundInterest = async () => {
		if (!compoundStartDate || !compoundEndDate || buyInstances.length === 0) {
			alert("Please fill in all required fields");
			return;
		}

		let totalInvested = 0;
		let btcAmount = 0;
		const historicalData: HistoricalDataPoint[] = [];

		await fetchAlpacaData(compoundStartDate, compoundEndDate, (bars) => {
			let cumulativeProfitLoss = 0;

			for (const bar of bars) {
				const date = parseISO(bar.t);
				let dailyPurchase = 0;

				for (const instance of buyInstances) {
					if (
						instance.frequency === "daily" ||
						(instance.frequency === "weekly" &&
							getDay(date) === instance.dayOfWeek) ||
						(instance.frequency === "monthly" &&
							getDate(date) === instance.dayOfMonth)
					) {
						dailyPurchase += instance.amount;
						totalInvested += instance.amount;
						btcAmount += instance.amount / bar.c;
					}
				}

				const currentValue = btcAmount * bar.c;
				cumulativeProfitLoss = currentValue - totalInvested;

				historicalData.push({
					date: bar.t,
					close: bar.c,
					high: bar.h,
					low: bar.l,
					open: bar.o,
					volume: bar.v,
					vwap: bar.vw,
					btcAmount: btcAmount,
					purchase: totalInvested,
					dailyPurchase,
					profitLoss: cumulativeProfitLoss,
				});
			}

			const finalValue = btcAmount * bars[bars.length - 1].c;
			const profitLoss = finalValue - totalInvested;
			const percentageProfit = (profitLoss / totalInvested) * 100;

			setCompoundResult({
				totalInvested,
				finalValue,
				profitLoss,
				percentageProfit,
				totalBtcBought: btcAmount,
			});
			setCompoundHistoricalData(historicalData);
		});
	};

	const CompoundInterestTooltip = ({
		active,
		payload,
		label,
	}: TooltipProps<ValueType, NameType>) => {
		if (active && payload && payload.length) {
			const data = payload[0].payload;
			return (
				<div className="bg-white p-4 rounded shadow">
					<p className="font-bold">{format(new Date(label), "MMM dd, yyyy")}</p>
					<p>Total Purchase: ${formatAmount(data.purchase)}</p>
					<p>Profit/Loss: ${formatAmount(data.profitLoss)}</p>
					<p>BTC Amount: {data.btcAmount.toFixed(8)} BTC</p>
					<p>BTC Price: ${formatAmount(data.close)}</p>
					{data.dailyPurchase > 0 && (
						<p>Daily Purchase: ${formatAmount(data.dailyPurchase)}</p>
					)}
				</div>
			);
		}
		return null;
	};

	return (
		<div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
			<div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl">
				<h1 className="text-3xl font-bold mb-6 text-center text-blue-600">
					BTC "What If" Calculator
				</h1>
				<Tabs defaultValue="calculator">
					<Tabs.List>
						<Tabs.Tab value="calculator">Single Purchase</Tabs.Tab>
						<Tabs.Tab value="historical">Historical Analysis</Tabs.Tab>
						<Tabs.Tab value="compound">Regular Purchases</Tabs.Tab>
					</Tabs.List>

					<Tabs.Panel value="calculator">
						<div className="mt-4">
							<div className="space-y-4">
								<div>
									<label
										htmlFor="amount"
										className="block text-sm font-medium text-gray-700 mb-1"
									>
										Simulated Purchase Amount (USD)
									</label>
									<input
										id="amount"
										type="number"
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
										value={purchaseAmount}
										onChange={(e) => setPurchaseAmount(e.target.value)}
										placeholder="Enter simulated amount in USD"
									/>
								</div>
								<div>
									<label
										htmlFor="date-range"
										className="block text-sm font-medium text-gray-700 mb-1"
									>
										Date Range
									</label>
									<Popover position="bottom" withArrow shadow="md">
										<Popover.Target>
											<TextInput
												value={formatDateRange(date)}
												readOnly
												placeholder="Select date range"
												rightSection={<Calendar size={16} />}
											/>
										</Popover.Target>
										<Popover.Dropdown>
											<DatePicker
												type="range"
												value={date}
												onChange={setDate}
												minDate={new Date(2021, 0, 1)}
												maxDate={maxDate}
											/>
										</Popover.Dropdown>
									</Popover>
								</div>
								<button
									type="button"
									className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200"
									onClick={calculateProfit}
								>
									Calculate
								</button>
							</div>
							{result && (
								<div className="mt-8 bg-gray-50 p-4 rounded-md border border-gray-200">
									<h2 className="text-xl font-semibold mb-4 text-center text-gray-800">
										Simulation Results
									</h2>
									<div className="space-y-2">
										<ResultRow
											icon={<DollarSign className="w-5 h-5" />}
											label="Simulated Purchase"
											value={`$${formatAmount(result.initialPurchase)}`}
										/>
										<ResultRow
											icon={<Calendar className="w-5 h-5" />}
											label="Buy Date"
											value={result.buyDate}
										/>
										<ResultRow
											icon={<Bitcoin className="w-5 h-5" />}
											label="BTC Price at Buy"
											value={`$${formatAmount(result.buyRate)}`}
										/>
										<ResultRow
											icon={<Bitcoin className="w-5 h-5" />}
											label="BTC Amount"
											value={`${result.btcAmount.toFixed(8)} BTC`}
										/>
										<ResultRow
											icon={<Calendar className="w-5 h-5" />}
											label="Sell Date"
											value={result.sellDate}
										/>
										<ResultRow
											icon={<Bitcoin className="w-5 h-5" />}
											label="BTC Price at Sell"
											value={`$${formatAmount(result.sellRate)}`}
										/>
										<ResultRow
											icon={<DollarSign className="w-5 h-5" />}
											label="Final Value"
											value={`$${formatAmount(result.finalValue)}`}
										/>
										<ResultRow
											icon={
												result.profitLoss >= 0 ? (
													<TrendingUp className="w-5 h-5" />
												) : (
													<TrendingDown className="w-5 h-5" />
												)
											}
											label="Profit/Loss"
											value={`$${formatAmount(Math.abs(result.profitLoss))}`}
											type={result.profitLoss >= 0 ? "positive" : "negative"}
										/>
										<ResultRow
											icon={<PercentSquare className="w-5 h-5" />}
											label="Percentage Profit"
											value={`${result.percentageProfit.toFixed(2)}%`}
											type={
												result.percentageProfit >= 0 ? "positive" : "negative"
											}
										/>
									</div>
								</div>
							)}
						</div>

						<div className="mt-8 bg-gray-100 p-4 rounded-md">
							<h3 className="text-lg font-semibold mb-2">How to Use:</h3>
							<ol className="list-decimal list-inside space-y-2">
								<li>Enter the amount you want to simulate buying in USD.</li>
								<li>Select the date range for your hypothetical scenario.</li>
								<li>Click "Calculate" to see the potential outcome.</li>
							</ol>
						</div>
					</Tabs.Panel>

					<Tabs.Panel value="historical">
						<div className="mt-4">
							<div className="flex items-center mb-4">
								<Calendar className="mr-2 h-5 w-5 text-gray-500" />
								<Text size="sm" fw={500}>
									Select Start Date:
								</Text>
							</div>
							<Popover
								position="bottom"
								withArrow
								shadow="md"
								opened={isHistoricalPopoverOpen}
								onChange={setIsHistoricalPopoverOpen}
							>
								<Popover.Target>
									<TextInput
										value={
											historicalStartDate
												? `${format(
														historicalStartDate,
														"MMM dd, yyyy",
													)} - ${format(
														historicalEndDate || new Date(),
														"MMM dd, yyyy",
													)}`
												: ""
										}
										readOnly
										placeholder="Select start date"
										rightSection={<Calendar size={16} />}
										onClick={() => setIsHistoricalPopoverOpen((o) => !o)}
									/>
								</Popover.Target>
								<Popover.Dropdown>
									<DatePicker
										value={historicalStartDate}
										onChange={handleHistoricalDateChange}
										maxDate={maxDate}
									/>
								</Popover.Dropdown>
							</Popover>
						</div>
						{historicalData.length > 0 && (
							<div className="mt-4">
								<ResponsiveContainer width="100%" height={400}>
									<LineChart
										data={historicalData}
										margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
									>
										<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
										<XAxis
											dataKey="date"
											tickFormatter={(tick) => format(new Date(tick), "MMM dd")}
										/>
										<YAxis tickFormatter={(tick) => `${tick.toFixed(0)}%`} />
										<Tooltip content={<CustomTooltip />} />
										<Line
											type="monotone"
											dataKey="return"
											stroke="#8884d8"
											strokeWidth={2}
											dot={false}
											activeDot={{ r: 8 }}
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						)}

						<div className="mt-8 bg-gray-100 p-4 rounded-md">
							<h3 className="text-lg font-semibold mb-2">How to Use:</h3>
							<ol className="list-decimal list-inside space-y-2">
								<li>Select a start date for the historical analysis.</li>
								<li>
									The end date will automatically be set to one month later or
									today, whichever comes first.
								</li>
								<li>
									View the graph to see how BTC's value changed over the
									selected period.
								</li>
								<li>
									Hover over points on the graph for more detailed information.
								</li>
							</ol>
						</div>
					</Tabs.Panel>

					<Tabs.Panel value="compound">
						<div className="mt-4 space-y-4">
							<div>
								<Text size="sm" fw={500} mb={2}>
									Time Period
								</Text>
								<Popover position="bottom" withArrow shadow="md">
									<Popover.Target>
										<TextInput
											value={formatDateRange([
												compoundStartDate,
												compoundEndDate,
											])}
											readOnly
											placeholder="Select date range"
											rightSection={<Calendar size={16} />}
										/>
									</Popover.Target>
									<Popover.Dropdown>
										<DatePicker
											type="range"
											value={[compoundStartDate, compoundEndDate]}
											onChange={([start, end]) => {
												setCompoundStartDate(start);
												setCompoundEndDate(end);
											}}
											maxDate={new Date()}
										/>
									</Popover.Dropdown>
								</Popover>
							</div>
							<div>
								<Text size="sm" fw={500} mb={2}>
									Purchase Instances:
								</Text>
								<Stack>
									{buyInstances.map((instance) => (
										<BuyInstanceInput
											key={instance.id}
											instance={instance}
											onUpdate={updateBuyInstance}
											onDelete={() => deleteBuyInstance(instance.id)}
										/>
									))}
								</Stack>
								<Button
									onClick={addBuyInstance}
									variant="outline"
									className="mt-2"
								>
									Add Purchase Instance
								</Button>
							</div>
							<Button onClick={calculateCompoundInterest} className="w-full">
								Calculate Regular Purchases
							</Button>
							{compoundResult && (
								<>
									<div className="mt-4 bg-gray-50 p-4 rounded-md border border-gray-200">
										<h2 className="text-xl font-semibold mb-4 text-center text-gray-800">
											Regular Purchases Results
										</h2>
										<div className="space-y-2">
											<ResultRow
												icon={<DollarSign className="w-5 h-5" />}
												label="Total Spent"
												value={`$${formatAmount(compoundResult.totalInvested)}`}
											/>
											<ResultRow
												icon={<Bitcoin className="w-5 h-5" />}
												label="Total BTC Bought"
												value={`${compoundResult.totalBtcBought.toFixed(
													8,
												)} BTC`}
											/>
											<ResultRow
												icon={<DollarSign className="w-5 h-5" />}
												label="Final Value"
												value={`$${formatAmount(compoundResult.finalValue)}`}
											/>
											<ResultRow
												icon={
													compoundResult.profitLoss >= 0 ? (
														<TrendingUp className="w-5 h-5" />
													) : (
														<TrendingDown className="w-5 h-5" />
													)
												}
												label="Profit/Loss"
												value={`$${formatAmount(
													Math.abs(compoundResult.profitLoss),
												)}`}
												type={
													compoundResult.profitLoss >= 0
														? "positive"
														: "negative"
												}
											/>
											<ResultRow
												icon={<PercentSquare className="w-5 h-5" />}
												label="Percentage Profit"
												value={`${compoundResult.percentageProfit.toFixed(2)}%`}
												type={
													compoundResult.percentageProfit >= 0
														? "positive"
														: "negative"
												}
											/>
										</div>
									</div>
									<div className="mt-4">
										<h3 className="text-lg font-semibold mb-2">
											Value Over Time
										</h3>
										<ResponsiveContainer width="100%" height={400}>
											<LineChart
												data={compoundHistoricalData}
												margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
											>
												<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
												<XAxis
													dataKey="date"
													tickFormatter={(tick) =>
														format(new Date(tick), "MMM dd")
													}
												/>
												<YAxis
													yAxisId="left"
													tickFormatter={(tick) => `$${formatAmount(tick)}`}
												/>
												<Tooltip content={<CompoundInterestTooltip />} />
												<Line
													yAxisId="left"
													type="monotone"
													dataKey="purchase"
													stroke="#8884d8"
													strokeWidth={2}
													dot={false}
													name="Total Purchase (USD)"
												/>
												<Line
													yAxisId="left"
													type="monotone"
													dataKey="profitLoss"
													stroke="#82ca9d"
													strokeWidth={2}
													dot={false}
													name="Profit/Loss (USD)"
												/>
												<Line
													yAxisId="left"
													type="monotone"
													dataKey={(data) => data.purchase + data.profitLoss}
													stroke="#ffc658"
													strokeWidth={2}
													dot={false}
													name="Final Value (USD)"
												/>
												<Legend />
											</LineChart>
										</ResponsiveContainer>
									</div>
								</>
							)}
						</div>

						<div className="mt-8 bg-gray-100 p-4 rounded-md">
							<h3 className="text-lg font-semibold mb-2">How to Use:</h3>
							<ol className="list-decimal list-inside space-y-2">
								<li>Set the time period by selecting a start and end date.</li>
								<li>
									Add one or more purchase instances, specifying the amount and
									frequency (daily, weekly, or monthly).
								</li>
								<li>
									For weekly purchases, select the day of the week. For monthly
									purchases, choose the day of the month.
								</li>
								<li>
									Click "Calculate Regular Purchases" to see the results and
									graph.
								</li>
								<li>
									The graph shows your total spent, profit/loss, and final value
									over time.
								</li>
							</ol>
						</div>
					</Tabs.Panel>
				</Tabs>
			</div>
		</div>
	);
}

export default App;
