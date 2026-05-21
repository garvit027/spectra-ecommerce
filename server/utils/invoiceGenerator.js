import PDFDocument from 'pdfkit';

export const generateInvoiceBuffer = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc
        .fillColor('#7c3aed')
        .fontSize(28)
        .text('SPECTRA COMMERCE', { align: 'right' })
        .fillColor('#444444')
        .fontSize(10)
        .text('123 Spectra Street', { align: 'right' })
        .text('Tech City, TC 10010', { align: 'right' })
        .moveDown();

      // Title
      doc.fillColor('#000000').fontSize(20).text('INVOICE', 50, 160);
      
      // Order Details
      doc.fontSize(10).text(`Order ID: ${order._id}`, 50, 190);
      doc.text(`Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString()}`, 50, 205);
      doc.text(`Payment Status: ${order.paymentStatus.toUpperCase()}`, 50, 220);

      // Billing Address
      doc.text('Bill To:', 300, 190);
      doc.font('Helvetica-Bold').text(order.shippingAddress.fullName, 300, 205);
      doc.font('Helvetica').text(order.shippingAddress.address, 300, 220);
      doc.text(`Phone: ${order.shippingAddress.phone}`, 300, 235);
      
      doc.moveDown(3);

      // Table Header
      const tableTop = 280;
      doc.font('Helvetica-Bold');
      doc.text('Item', 50, tableTop);
      doc.text('Qty', 350, tableTop);
      doc.text('Price', 400, tableTop);
      doc.text('Total', 480, tableTop, { align: 'right' });

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Table Items
      let y = tableTop + 30;
      doc.font('Helvetica');
      order.items.forEach(item => {
        doc.text(item.name, 50, y);
        doc.text(item.qty.toString(), 350, y);
        doc.text(`Rs. ${item.price}`, 400, y);
        doc.text(`Rs. ${item.qty * item.price}`, 480, y, { align: 'right' });
        y += 20;
      });

      doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();

      // Totals
      doc.font('Helvetica-Bold');
      doc.text('Subtotal:', 380, y + 30);
      doc.font('Helvetica').text(`Rs. ${order.subtotal}`, 480, y + 30, { align: 'right' });

      doc.font('Helvetica-Bold');
      doc.text('Shipping:', 380, y + 50);
      doc.font('Helvetica').text(`Rs. ${order.shipping}`, 480, y + 50, { align: 'right' });

      doc.font('Helvetica-Bold');
      doc.text('Tax:', 380, y + 70);
      doc.font('Helvetica').text(`Rs. ${order.tax}`, 480, y + 70, { align: 'right' });

      doc.font('Helvetica-Bold').fontSize(12);
      doc.fillColor('#7c3aed');
      doc.text('Total:', 380, y + 100);
      doc.text(`Rs. ${order.total}`, 480, y + 100, { align: 'right' });

      // Footer
      doc.fillColor('#444444').fontSize(10);
      doc.text('Thank you for shopping with Spectra Commerce!', 50, 700, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
