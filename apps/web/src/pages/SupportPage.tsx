import { useState } from 'react';
import { MessageSquare, Send, Phone, Mail, Clock } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardHeader, CardTitle, Button } from '@/components/ui';

export function SupportPage() {
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      setSubmitted(true);
      setMessage('');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <p className="text-gray-500 mt-1">Get help with your account</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="font-medium text-gray-900">Email Support</h3>
            <p className="text-sm text-gray-500 mt-1">support@peeap.com</p>
          </Card>

          <Card className="p-4 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-medium text-gray-900">Phone Support</h3>
            <p className="text-sm text-gray-500 mt-1">+232 76 000000</p>
          </Card>

          <Card className="p-4 text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-medium text-gray-900">Business Hours</h3>
            <p className="text-sm text-gray-500 mt-1">Mon-Fri 9AM-5PM</p>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Send us a message
            </CardTitle>
          </CardHeader>

          {submitted ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Message Sent!</h3>
              <p className="text-gray-500 mb-4">We'll get back to you within 24 hours.</p>
              <Button onClick={() => setSubmitted(false)}>Send Another Message</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option>General Inquiry</option>
                  <option>Account Issue</option>
                  <option>Transaction Problem</option>
                  <option>Card Issue</option>
                  <option>Technical Support</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe your issue or question..."
                />
              </div>

              <Button type="submit" disabled={!message.trim()}>
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </form>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
