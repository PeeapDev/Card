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
  Upload,
  Send,
  Users,
  DollarSign,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";

interface Recipient {
  id: string;
  name: string;
  account: string;
  accountType: string;
  amount: number;
}

export default function NewBatchPaymentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [description, setDescription] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: "1", name: "", account: "", accountType: "mobile_money", amount: 0 },
  ]);

  const addRecipient = () => {
    setRecipients([
      ...recipients,
      { id: Date.now().toString(), name: "", account: "", accountType: "mobile_money", amount: 0 },
    ]);
  };

  const removeRecipient = (id: string) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((r) => r.id !== id));
    }
  };

  const updateRecipient = (id: string, field: keyof Recipient, value: string | number) => {
    setRecipients(
      recipients.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const totalAmount = recipients.reduce((sum, r) => sum + (r.amount || 0), 0);
  const validRecipients = recipients.filter(
    (r) => r.name && r.account && r.amount > 0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-SL", {
      style: "currency",
      currency: "SLE",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName || validRecipients.length === 0) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    router.push("/dashboard/batch-payments");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/batch-payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Batch Payment</h1>
          <p className="text-muted-foreground">Send payments to multiple recipients</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Form */}
          <div className="md:col-span-2 space-y-6">
            {/* Batch Details */}
            <Card>
              <CardHeader>
                <CardTitle>Batch Details</CardTitle>
                <CardDescription>Give your batch payment a name and description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="batchName">Batch Name *</Label>
                  <Input
                    id="batchName"
                    placeholder="e.g., December Salaries"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Optional description for this batch payment..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recipients */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recipients</CardTitle>
                    <CardDescription>Add recipients and amounts</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount (SLE)</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.map((recipient) => (
                      <TableRow key={recipient.id}>
                        <TableCell>
                          <Input
                            placeholder="Recipient name"
                            value={recipient.name}
                            onChange={(e) =>
                              updateRecipient(recipient.id, "name", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Phone or account #"
                            value={recipient.account}
                            onChange={(e) =>
                              updateRecipient(recipient.id, "account", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={recipient.accountType}
                            onValueChange={(value) =>
                              updateRecipient(recipient.id, "accountType", value)
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mobile_money">Mobile Money</SelectItem>
                              <SelectItem value="bank_account">Bank Account</SelectItem>
                              <SelectItem value="peeap_wallet">Peeap Wallet</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            placeholder="0"
                            className="text-right"
                            value={recipient.amount || ""}
                            onChange={(e) =>
                              updateRecipient(
                                recipient.id,
                                "amount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRecipient(recipient.id)}
                            disabled={recipients.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={addRecipient}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recipient
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
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Recipients</span>
                  </div>
                  <span className="font-medium">{validRecipients.length}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Total Amount</span>
                  </div>
                  <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
                </div>

                {validRecipients.length === 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 text-yellow-700">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <p className="text-sm">
                      Add at least one valid recipient with name, account, and amount.
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !batchName || validRecipients.length === 0}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Processing..." : "Send Batch Payment"}
                </Button>

                <Link href="/dashboard/batch-payments">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Import from CSV</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4 border-2 border-dashed rounded-lg">
                  <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a CSV file or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: name, account, type, amount
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
