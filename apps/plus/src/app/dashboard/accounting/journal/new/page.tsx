"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Plus,
  Trash2,
  BookOpen,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface JournalLine {
  id: string;
  account: string;
  description: string;
  debit: number;
  credit: number;
}

const accounts = [
  { code: "1000", name: "Cash" },
  { code: "1100", name: "Accounts Receivable" },
  { code: "1200", name: "Inventory - Fuel" },
  { code: "1300", name: "Prepaid Expenses" },
  { code: "1500", name: "Equipment" },
  { code: "2000", name: "Accounts Payable" },
  { code: "2100", name: "Salaries Payable" },
  { code: "2200", name: "Taxes Payable" },
  { code: "3000", name: "Owner's Capital" },
  { code: "3100", name: "Retained Earnings" },
  { code: "4000", name: "Fuel Sales" },
  { code: "4100", name: "Service Revenue" },
  { code: "5000", name: "Cost of Goods Sold" },
  { code: "5100", name: "Salaries Expense" },
  { code: "5200", name: "Rent Expense" },
  { code: "5300", name: "Utilities Expense" },
  { code: "5400", name: "Depreciation Expense" },
];

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([
    { id: "1", account: "", description: "", debit: 0, credit: 0 },
    { id: "2", account: "", description: "", debit: 0, credit: 0 },
  ]);

  const addLine = () => {
    setLines([
      ...lines,
      { id: Date.now().toString(), account: "", description: "", debit: 0, credit: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 2) {
      setLines(lines.filter((l) => l.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof JournalLine, value: string | number) => {
    setLines(
      lines.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const totalDebits = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredits = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const isBalanced = totalDebits === totalCredits && totalDebits > 0;
  const validLines = lines.filter((l) => l.account && (l.debit > 0 || l.credit > 0));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-SL", {
      style: "currency",
      currency: "SLE",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced || validLines.length < 2) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    router.push("/dashboard/accounting/journal");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/accounting/journal">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Journal Entry</h1>
          <p className="text-muted-foreground">Record a new accounting transaction</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Form */}
          <div className="md:col-span-2 space-y-6">
            {/* Entry Details */}
            <Card>
              <CardHeader>
                <CardTitle>Entry Details</CardTitle>
                <CardDescription>Basic information about this journal entry</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="entryDate">Date *</Label>
                    <Input
                      id="entryDate"
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference">Reference</Label>
                    <Input
                      id="reference"
                      placeholder="e.g., INV-2024-001"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memo">Memo</Label>
                  <Textarea
                    id="memo"
                    placeholder="Description of this journal entry..."
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Journal Lines */}
            <Card>
              <CardHeader>
                <CardTitle>Journal Lines</CardTitle>
                <CardDescription>Add debit and credit entries (must balance)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right w-[150px]">Debit</TableHead>
                      <TableHead className="text-right w-[150px]">Credit</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <Select
                            value={line.account}
                            onValueChange={(value) => updateLine(line.id, "account", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((acc) => (
                                <SelectItem key={acc.code} value={acc.code}>
                                  {acc.code} - {acc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Line description"
                            value={line.description}
                            onChange={(e) => updateLine(line.id, "description", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="0"
                            className="text-right"
                            value={line.debit || ""}
                            onChange={(e) =>
                              updateLine(line.id, "debit", parseFloat(e.target.value) || 0)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            placeholder="0"
                            className="text-right"
                            value={line.credit || ""}
                            onChange={(e) =>
                              updateLine(line.id, "credit", parseFloat(e.target.value) || 0)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(line.id)}
                            disabled={lines.length <= 2}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2} className="text-right">
                        Totals
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(totalDebits)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalCredits)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={addLine}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm">Total Debits</span>
                  <span className="font-bold">{formatCurrency(totalDebits)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm">Total Credits</span>
                  <span className="font-bold">{formatCurrency(totalCredits)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm">Difference</span>
                  <span className={`font-bold ${totalDebits !== totalCredits ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(Math.abs(totalDebits - totalCredits))}
                  </span>
                </div>

                {isBalanced ? (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 text-green-700">
                    <CheckCircle2 className="h-4 w-4 mt-0.5" />
                    <p className="text-sm">Entry is balanced and ready to post.</p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 text-yellow-700">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <p className="text-sm">
                      {totalDebits === 0 && totalCredits === 0
                        ? "Add debit and credit entries."
                        : "Debits and credits must be equal."}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !isBalanced || validLines.length < 2}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Posting..." : "Post Journal Entry"}
                </Button>

                <Link href="/dashboard/accounting/journal">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>- Debits increase assets & expenses</li>
                  <li>- Credits increase liabilities & revenue</li>
                  <li>- Total debits must equal total credits</li>
                  <li>- Minimum 2 lines required</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
