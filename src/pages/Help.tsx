import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  HelpCircle,
  Search,
  Book,
  Video,
  MessageSquare,
  FileQuestion,
  Send,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const helpCategories = [
  {
    icon: Book,
    title: 'Documentation',
    description: 'Browse all guides',
  },
  {
    icon: Video,
    title: 'Video Tutorials',
    description: 'Watch & learn',
  },
  {
    icon: MessageSquare,
    title: 'Live Chat',
    description: 'Chat with support',
  },
  {
    icon: FileQuestion,
    title: 'FAQ',
    description: 'Quick answers',
  },
];

const faqs = [
  {
    category: 'Visitors',
    question: 'How do I register a new visitor?',
    answer:
      'To register a new visitor, go to the Visitors page and click "Pre-Register Visitor". Fill in the required details like name, email, company, and host information. The visitor will receive a confirmation email with a QR code for check-in.',
  },
  {
    category: 'Check-in',
    question: 'How does the QR code check-in work?',
    answer:
      'Visitors receive a QR code via email when pre-registered. At the gate, security personnel can scan this QR code using the Check-in/Out feature. The system automatically validates the visitor and marks them as checked in.',
  },
  {
    category: 'Locations',
    question: 'Can I manage multiple locations?',
    answer:
      'Yes! VisiGuard supports multiple locations. Go to the Locations page to add new facilities. Each location can have its own gates, departments, and visitor capacity settings.',
  },
  {
    category: 'Gates',
    question: 'How do I configure gate settings?',
    answer:
      'Navigate to the Gates page to manage entry/exit points. You can set operating hours, capacity limits, enable/disable QR scanning, and configure gate types (Entry Only, Exit Only, or Both).',
  },
  {
    category: 'Security',
    question: 'How do I set up user roles and permissions?',
    answer:
      'User roles can be configured in Settings > Security. Available roles include Super Admin, Admin, Security Guard, and Receptionist. Each role has different access levels to features and data.',
  },
];

export default function Help() {
  const navigate = useNavigate();
  
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            How can we help you?
          </h1>
          <p className="text-muted-foreground">
            Find answers, guides, and get support for VisiGuard
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            className="pl-12 h-12 text-lg"
          />
        </div>

        {/* Help Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {helpCategories.map((category) => (
            <Card
              key={category.title}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <category.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{category.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {category.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Proposal Document Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-info/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Product Proposal Document</h3>
                  <p className="text-sm text-muted-foreground">
                    Download the complete VisiGuard VMS proposal for presentations
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate('/proposal-document')} className="gap-2">
                <FileText className="h-4 w-4" />
                View Proposal
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FAQs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Quick answers to common questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-primary font-medium">
                          {faq.category}
                        </span>
                        <span>{faq.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Contact Support
              </CardTitle>
              <CardDescription>
                Can't find what you're looking for? Reach out to us
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your issue"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Describe your issue in detail..."
                    rows={5}
                  />
                </div>
                <Button className="w-full gap-2">
                  <Send className="h-4 w-4" />
                  Submit Ticket
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
