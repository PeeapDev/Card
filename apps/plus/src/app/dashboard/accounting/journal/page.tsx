"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, Filter, Eye, BookOpen, Calendar } from "lucide-react";

const mockJournalEntries = [
  {
    id: "JE-001",
    date: "2024-12-14",
    description: "Daily fuel sales revenue",
    reference: "SALES-2024-1214",
    status: "posted",
    lines: [
      { account: "Cash", debit: 15000, credit: null },
      { account: "Fuel Sales", debit: null, credit: 15000 },
    ],
    totalDebit: 15000,
    totalCredit: 15000,
    createdBy: "John Smith",
  },
  {
    id: "JE-002",
    date: "2024-12-14",
    description: "Fuel inventory purchase",
    reference: "PO-2024-0892",
    status: "posted",
    lines: [
      { account: "Inventory - Fuel", debit: 8500, credit: null },
      { account: "Accounts Payable", debit: null, credit: 8500 },
    ],
    totalDebit: 8500,
    totalCredit: 8500,
    createdBy: "Sarah Johnson",
  },
  {
    id: "JE-003",
    date: "2024-12-13",
    description: "Monthly salary payment",
    reference: "PAY-2024-12",
    status: "posted",
    lines: [
      { account: "Salaries Expense", debit: 12000, credit: null },
      { account: "Cash", debit: null, credit: 12000 },
    ],
    totalDebit: 12000,
    totalCredit: 12000,
    createdBy: "Sarah Johnson",
  },
  {
    id: "JE-004",
    date: "2024-12-13",
    description: "Customer payment received",
    reference: "REC-2024-0456",
    status: "posted",
    lines: [
      { account: "Cash", debit: 5000, credit: null },
      { account: "Accounts Receivable", debit: null, credit: 5000 },
    ],
    totalDebit: 5000,
    totalCredit: 5000,
    createdBy: "John Smith",
  },
  {
    id: "JE-005",
    date: "2024-12-12",
    description: "Utility bill payment",
    reference: "UTIL-2024-12",
    status: "posted",
    lines: [
      { account: "Utilities Expense", debit: 850, credit: null },
      { account: "Cash", debit: null, credit: 850 },
    ],
    totalDebit: 850,
    totalCredit: 850,
    createdBy: "Sarah Johnson",
  },
  {
    id: "JE-006",
    date: "2024-12-12",
    description: "Equipment depreciation",
    reference: "DEP-2024-12",
    status: "draft",
    lines: [
      { account: "Depreciation Expense", debit: 1500, credit: null },
      { account: "Accumulated Depreciation", debit: null, credit: 1500 },
    ],
    totalDebit: 1500,
    totalCredit: 1500,
    createdBy: "System",
  },
];

export default function JournalEntriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat("en-SL", {
      style: "currency",
      currency: "SLE",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "posted":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Posted</Badge>;
      case "draft":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Draft</Badge>;
      case "void":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Void</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredEntries = mockJournalEntries.filter((entry) => {
    const matchesSearch =
      entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || entry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalDebits = filteredEntries.reduce((sum, e) => sum + e.totalDebit, 0);
  const totalCredits = filteredEntries.reduce((sum, e) => sum + e.totalCredit, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Journal Entries</h1>
          <p className="text-muted-foreground">
            Record and manage accounting transactions
          </p>
        </div>
        <Link href="/dashboard/accounting/journal/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockJournalEntries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Posted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mockJournalEntries.filter(e => e.status === "posted").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDebits)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCredits)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Entries</CardTitle>
              <CardDescription>View and manage journal entries</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entries..."
                  className="pl-9 w-[250px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(entry.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">by {entry.createdBy}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{entry.reference}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(entry.totalDebit)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(entry.totalCredit)}
                  </TableCell>
                  <TableCell>{getStatusBadge(entry.status)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredEntries.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No journal entries found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
