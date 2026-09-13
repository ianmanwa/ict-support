const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Document, Packer, Table, TableRow, TableCell, Paragraph, TextRun, HeadingLevel, WidthType } = require('docx');

const Ticket = require('../models/Ticket');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(protect, requireRole('admin'));

// Shared query: every non-deleted ticket, fully populated, oldest first.
async function fetchTicketsForReport() {
  return Ticket.find({ isDeleted: false })
    .populate('requester', 'name email')
    .populate('assignedTechnician', 'name email')
    .populate('department', 'name')
    .sort({ createdAt: 1 });
}

const fmt = (d) => (d ? new Date(d).toLocaleString() : '-');

// GET /api/reports/tickets.xlsx
router.get('/tickets.xlsx', async (req, res) => {
  try {
    const tickets = await fetchTicketsForReport();
    const generatedAt = new Date();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ICT Help Desk';
    workbook.created = generatedAt;

    const sheet = workbook.addWorksheet('Tickets');
    sheet.columns = [
      { header: 'Requester', key: 'requester', width: 20 },
      { header: 'Name on Ticket', key: 'name', width: 20 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'Details', key: 'details', width: 30 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'User Solved', key: 'userSolved', width: 12 },
      { header: 'Technician Solved', key: 'technicianSolved', width: 16 },
      { header: 'Assigned Technician', key: 'technician', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 22 },
      { header: 'Closed At', key: 'closedAt', width: 22 }
    ];
    sheet.getRow(1).font = { bold: true };

    tickets.forEach((t) => {
      sheet.addRow({
        requester: t.requester ? t.requester.name : 'Unknown',
        name: t.name,
        location: t.location,
        phone: t.phone || '-',
        department: t.department ? t.department.name : '-',
        details: t.details || '-',
        status: t.status,
        userSolved: t.userSolved ? 'Yes' : 'No',
        technicianSolved: t.technicianSolved ? 'Yes' : 'No',
        technician: t.assignedTechnician ? t.assignedTechnician.name : '-',
        createdAt: fmt(t.createdAt),
        closedAt: fmt(t.closedAt)
      });
    });

    sheet.addRow([]);
    sheet.addRow([`Report generated: ${generatedAt.toLocaleString()}`]);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="ict-tickets-report.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Could not generate Excel report', error: err.message });
  }
});

// GET /api/reports/tickets.pdf
router.get('/tickets.pdf', async (req, res) => {
  try {
    const tickets = await fetchTicketsForReport();
    const generatedAt = new Date();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ict-tickets-report.pdf"');

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(18).text('ICT Help Desk — Tickets Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor('#666666').text(`Generated: ${generatedAt.toLocaleString()}`, {
      align: 'center'
    });
    doc.moveDown(1);
    doc.fillColor('#000000');

    if (tickets.length === 0) {
      doc.fontSize(11).text('No tickets found.');
    }

    tickets.forEach((t, index) => {
      if (doc.y > 700) doc.addPage();

      doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${t.name} — ${t.status.toUpperCase()}`);
      doc.font('Helvetica').fontSize(9.5);
      doc.text(`Requester: ${t.requester ? t.requester.name : 'Unknown'}`);
      doc.text(`Location: ${t.location}    Phone: ${t.phone || '-'}`);
      doc.text(`Department: ${t.department ? t.department.name : '-'}`);
      if (t.details) doc.text(`Details: ${t.details}`);
      doc.text(`Assigned Technician: ${t.assignedTechnician ? t.assignedTechnician.name : '-'}`);
      doc.text(
        `User Solved: ${t.userSolved ? 'Yes' : 'No'}    Technician Solved: ${t.technicianSolved ? 'Yes' : 'No'}`
      );
      doc.text(`Created: ${fmt(t.createdAt)}    Closed: ${fmt(t.closedAt)}`);
      if (t.remarks && t.remarks.length > 0) {
        doc.text(`Remarks: ${t.remarks.map((r) => r.text).join(' | ')}`);
      }
      doc.moveDown(0.8);
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Could not generate PDF report', error: err.message });
  }
});

// GET /api/reports/tickets.docx
router.get('/tickets.docx', async (req, res) => {
  try {
    const tickets = await fetchTicketsForReport();
    const generatedAt = new Date();

    const headerCells = [
      'Requester',
      'Name',
      'Location',
      'Phone',
      'Department',
      'Status',
      'User Solved',
      'Tech Solved',
      'Technician',
      'Created',
      'Closed'
    ].map(
      (text) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })]
        })
    );

    const rows = [new TableRow({ children: headerCells })];

    tickets.forEach((t) => {
      const values = [
        t.requester ? t.requester.name : 'Unknown',
        t.name,
        t.location,
        t.phone || '-',
        t.department ? t.department.name : '-',
        t.status,
        t.userSolved ? 'Yes' : 'No',
        t.technicianSolved ? 'Yes' : 'No',
        t.assignedTechnician ? t.assignedTechnician.name : '-',
        fmt(t.createdAt),
        fmt(t.closedAt)
      ];

      rows.push(
        new TableRow({
          children: values.map(
            (v) => new TableCell({ children: [new Paragraph(String(v))] })
          )
        })
      );
    });

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'ICT Help Desk — Tickets Report',
              heading: HeadingLevel.HEADING_1
            }),
            new Paragraph({ text: `Generated: ${generatedAt.toLocaleString()}` }),
            new Paragraph({ text: '' }),
            new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows })
          ]
        }
      ]
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="ict-tickets-report.docx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: 'Could not generate Word report', error: err.message });
  }
});

module.exports = router;
