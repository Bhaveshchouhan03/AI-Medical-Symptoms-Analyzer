import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PdfService {

  private loadJsPdf(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Check if jsPDF is already loaded globally
      const globalWindow = window as any;
      if (globalWindow.jspdf) {
        resolve(globalWindow.jspdf);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.async = true;
      script.onload = () => {
        if (globalWindow.jspdf) {
          resolve(globalWindow.jspdf);
        } else {
          reject(new Error('jsPDF loaded but namespace not found.'));
        }
      };
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  }

  async generateReportPdf(record: any): Promise<void> {
    try {
      const jspdfModule = await this.loadJsPdf();
      const { jsPDF } = jspdfModule;
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      // Page parameters: A4 is 210mm x 297mm
      const pageWidth = 210;
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let currentY = 15;

      // ── COLOR PALETTE ──
      const primaryColor = [109, 40, 217]; // Violet #6D28D9
      const secondaryColor = [31, 41, 55]; // Gray-800
      const accentColor = [220, 38, 38];    // Red-600
      const lightBg = [249, 250, 251];     // Gray-50
      const borderTheme = [229, 231, 235];  // Gray-200

      // Helper: Draw Section Title
      const drawSectionHeader = (title: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(title.toUpperCase(), margin, currentY);
        currentY += 2;
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.3);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 5;
      };

      // Helper: Check Page Overflow
      const checkPageOverflow = (neededHeight: number) => {
        if (currentY + neededHeight > 280) {
          doc.addPage();
          currentY = 15;
          // Redraw small footer page marker
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(156, 163, 175);
          doc.text(`Page 2 - Medical Report Summary`, margin, 287);
        }
      };

      // ════════════ 1. HEADER BANNER ════════════
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(margin, currentY, contentWidth, 24, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text('AI HEALTH SYMPTOM REPORT', margin + 6, currentY + 9);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(221, 214, 254);
      doc.text('Generated using Google Gemini AI Health Analysis for Educational Purposes Only', margin + 6, currentY + 14);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`REPORT ID: ${record._id.substring(0, 10).toUpperCase()}`, pageWidth - margin - 40, currentY + 9);

      currentY += 29;

      // ════════════ 2. PATIENT DETAILS GRID ════════════
      checkPageOverflow(30);
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderTheme[0], borderTheme[1], borderTheme[2]);
      doc.rect(margin, currentY, contentWidth, 22, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128); // gray-500
      doc.text('PATIENT GENDER', margin + 5, currentY + 6);
      doc.text('PATIENT AGE', margin + 45, currentY + 6);
      doc.text('DURATION OF SYMPTOMS', margin + 85, currentY + 6);
      doc.text('REPORT GENERATED', margin + 130, currentY + 6);

      const parsedDate = new Date(record.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(record.gender.toUpperCase(), margin + 5, currentY + 12);
      doc.text(`${record.age} Years`, margin + 45, currentY + 12);
      doc.text(record.duration, margin + 85, currentY + 12);
      doc.text(parsedDate, margin + 130, currentY + 12);

      // Separator line in grid
      doc.setDrawColor(borderTheme[0], borderTheme[1], borderTheme[2]);
      doc.line(margin + 5, currentY + 15, margin + contentWidth - 5, currentY + 15);

      // Severity indicators
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(record.severity >= 7 ? accentColor[0] : primaryColor[0], record.severity >= 7 ? accentColor[1] : primaryColor[1], record.severity >= 7 ? accentColor[2] : primaryColor[2]);
      doc.text(`Symptom Severity Score: ${record.severity} / 10`, margin + 5, currentY + 19.5);

      currentY += 28;

      // ════════════ 3. SYMPTOMS LIST ════════════
      checkPageOverflow(25);
      drawSectionHeader('Reported Symptoms');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

      // Render symptoms as custom pill text
      let textX = margin;
      record.symptoms.forEach((symptom: string) => {
        const textWidth = doc.getTextWidth(symptom) + 6;
        if (textX + textWidth > pageWidth - margin) {
          textX = margin;
          currentY += 6;
          checkPageOverflow(10);
        }

        doc.setFillColor(239, 246, 255); // blue-50
        doc.setDrawColor(191, 219, 254);  // blue-200
        doc.rect(textX, currentY, textWidth - 2, 5, 'FD');
        doc.setTextColor(29, 78, 216);    // blue-700
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(symptom, textX + 2, currentY + 3.8);

        textX += textWidth;
      });

      currentY += 10;

      // Render Notes if any
      if (record.notes) {
        checkPageOverflow(15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(107, 114, 128);
        doc.text('Patient Personal Notes:', margin, currentY);
        currentY += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        const noteSplit = doc.splitTextToSize(record.notes, contentWidth);
        doc.text(noteSplit, margin, currentY);
        currentY += (noteSplit.length * 4.5) + 4;
      }

      // ════════════ 4. AI DIAGNOSIS SUMMARY ════════════
      if (record.aiAnalysis) {
        const ai = record.aiAnalysis;

        checkPageOverflow(40);
        drawSectionHeader('AI Health Risk Summary');

        // Health Risk score box
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.setDrawColor(borderTheme[0], borderTheme[1], borderTheme[2]);
        doc.rect(margin, currentY, contentWidth, 14, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`AI Care Recommendation Level: ${ai.urgencyLevel.toUpperCase()}`, margin + 5, currentY + 5.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(ai.healthRiskLevel === 'high' ? accentColor[0] : 107, ai.healthRiskLevel === 'high' ? accentColor[1] : 114, ai.healthRiskLevel === 'high' ? accentColor[2] : 128);
        doc.text(`Health Risk Level: ${ai.healthRiskLevel.toUpperCase()} (Risk Score: ${ai.healthRiskScore}/100)`, margin + 5, currentY + 10);

        currentY += 19;

        // Executive Summary
        checkPageOverflow(25);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(107, 114, 128);
        doc.text('Clinical Summary:', margin, currentY);
        currentY += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        const summarySplit = doc.splitTextToSize(ai.summary, contentWidth);
        doc.text(summarySplit, margin, currentY);
        currentY += (summarySplit.length * 4.5) + 6;

        // Possible Causes table
        if (ai.possibleCauses && ai.possibleCauses.length > 0) {
          checkPageOverflow(30);
          drawSectionHeader('Possible Causes');

          ai.possibleCauses.forEach((cause: any) => {
            checkPageOverflow(20);
            doc.setFillColor(249, 250, 251);
            doc.setDrawColor(243, 244, 246);
            doc.rect(margin, currentY, contentWidth, 14, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            doc.text(cause.name, margin + 4, currentY + 5.5);

            // Likelihood Tag
            const likelihoodText = `Likelihood: ${cause.likelihood.toUpperCase()}`;
            doc.setFontSize(7.5);
            doc.setTextColor(cause.likelihood === 'high' ? accentColor[0] : 79, cause.likelihood === 'high' ? accentColor[1] : 70, cause.likelihood === 'high' ? accentColor[2] : 229);
            doc.text(likelihoodText, pageWidth - margin - doc.getTextWidth(likelihoodText) - 4, currentY + 5.5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128);
            const explanationSplit = doc.splitTextToSize(cause.explanation, contentWidth - 8);
            doc.text(explanationSplit, margin + 4, currentY + 10);

            currentY += 17;
          });
          currentY += 2;
        }

        // Home Care Tips list
        if (ai.homeCareTips && ai.homeCareTips.length > 0) {
          checkPageOverflow(30);
          drawSectionHeader('Recommended Home Care Guidelines');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

          ai.homeCareTips.forEach((tip: string) => {
            checkPageOverflow(12);
            // Draw small bullet point
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.circle(margin + 2, currentY + 1.5, 0.6, 'F');

            const tipSplit = doc.splitTextToSize(tip, contentWidth - 6);
            doc.text(tipSplit, margin + 6, currentY + 2.5);
            currentY += (tipSplit.length * 4) + 2.5;
          });
          currentY += 4;
        }

        // Emergency seek warnings
        if (ai.emergencyWarnings) {
          checkPageOverflow(20);
          doc.setFillColor(254, 242, 242); // red-50
          doc.setDrawColor(252, 165, 165);  // red-300
          doc.rect(margin, currentY, contentWidth, 14, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(153, 27, 27); // red-800
          doc.text('⚠️ SEEK EMERGENCY CARE IMMEDIATELY IF YOU EXPERIENCE:', margin + 4, currentY + 4.5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(185, 28, 28);
          const emergSplit = doc.splitTextToSize(ai.emergencyWarnings, contentWidth - 8);
          doc.text(emergSplit, margin + 4, currentY + 9);

          currentY += 19;
        }
      }

      // ════════════ 5. EDUCATION DISCLAIMER ════════════
      checkPageOverflow(24);
      doc.setFillColor(255, 251, 235); // amber-50
      doc.setDrawColor(253, 230, 138);  // amber-200
      doc.rect(margin, currentY, contentWidth, 18, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(146, 64, 14); // amber-800
      doc.text('⚠️ MEDICAL EDUCATION DISCLAIMER', margin + 4, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(180, 83, 9); // amber-700
      const disclaimerText = record.aiAnalysis?.disclaimer ||
        'This AI analysis is for educational and informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified physician or healthcare provider before initiating or terminating medical therapies.';

      const disclaimerSplit = doc.splitTextToSize(disclaimerText, contentWidth - 8);
      doc.text(disclaimerSplit, margin + 4, currentY + 8);

      // Save output
      doc.save(`Medical_AI_Report_${record._id.substring(0, 10)}.pdf`);
    } catch (err) {
      console.error('[PdfService] Error generating medical report PDF:', err);
      throw err;
    }
  }

  async generateHealthTwinPdf(data: any): Promise<void> {
    try {
      const jspdfModule = await this.loadJsPdf();
      const { jsPDF } = jspdfModule;
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let currentY = 15;

      // Color Palette
      const primaryColor = [13, 148, 136];  // Teal #0D9488
      const secondaryColor = [31, 41, 55];  // Gray-800
      const lightBg = [249, 250, 251];     // Gray-50
      const borderTheme = [229, 231, 235];  // Gray-200
      const accentColor = [124, 58, 237];   // Violet #7C3AED

      // Helpers
      const drawSectionHeader = (title: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(title.toUpperCase(), margin, currentY);
        currentY += 2;
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.3);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 5;
      };

      const checkPageOverflow = (neededHeight: number) => {
        if (currentY + neededHeight > 280) {
          doc.addPage();
          currentY = 15;
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(156, 163, 175);
          doc.text(`Page 2 - AI Digital Health Twin Report`, margin, 287);
        }
      };

      // 1. Header Banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(margin, currentY, contentWidth, 24, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('AI DIGITAL HEALTH TWIN REPORT', margin + 6, currentY + 9);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(204, 251, 241); // light teal text
      doc.text('A virtual predictive copy of patient wellness diagnostics powered by Gemini AI', margin + 6, currentY + 15);

      const todayStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`DATE: ${todayStr}`, pageWidth - margin - 45, currentY + 9);

      currentY += 29;

      // 2. Twin Profile Details Grid
      checkPageOverflow(26);
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderTheme[0], borderTheme[1], borderTheme[2]);
      doc.rect(margin, currentY, contentWidth, 24, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text('PATIENT NAME', margin + 5, currentY + 6);
      doc.text('AGE / GENDER', margin + 50, currentY + 6);
      doc.text('CURRENT BMI', margin + 90, currentY + 6);
      doc.text('ACTIVITY LEVEL', margin + 125, currentY + 6);
      doc.text('MOOD STATUS', margin + 155, currentY + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(data.profile.name, margin + 5, currentY + 12);
      doc.text(`${data.profile.age} Yrs / ${data.profile.gender}`, margin + 50, currentY + 12);
      doc.text(`${data.profile.bmi}`, margin + 90, currentY + 12);
      doc.text(data.profile.activityLevel, margin + 125, currentY + 12);
      doc.text(data.profile.mood, margin + 155, currentY + 12);

      // Score line
      doc.setDrawColor(borderTheme[0], borderTheme[1], borderTheme[2]);
      doc.line(margin + 5, currentY + 15, margin + contentWidth - 5, currentY + 15);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text(`Overall Wellness Twin Health Score: ${data.profile.healthScore} / 100 (${data.profile.status})`, margin + 5, currentY + 20.5);

      currentY += 30;

      // 3. Health Score Breakdown
      checkPageOverflow(30);
      drawSectionHeader('Wellness Metrics Breakdown');
      
      const breakdown = data.score.current.breakdown || {};
      const metrics = [
        { label: 'Symptom Factor', val: breakdown.symptoms || 0 },
        { label: 'Body Mass Index', val: breakdown.bmi || 0 },
        { label: 'Sleep Quality', val: breakdown.sleep || 0 },
        { label: 'Water Hydration', val: breakdown.water || 0 },
        { label: 'Activity Index', val: breakdown.activity || 0 },
        { label: 'Appointments Check', val: breakdown.appointments || 0 }
      ];

      doc.setFontSize(8.5);
      let cellX = margin;
      metrics.forEach((item, index) => {
        if (index > 0 && index % 3 === 0) {
          cellX = margin;
          currentY += 10;
          checkPageOverflow(12);
        }
        
        doc.setFillColor(243, 244, 246);
        doc.rect(cellX, currentY, 55, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 65, 81);
        doc.text(item.label, cellX + 2, currentY + 5.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(item.val >= 75 ? 13 : 220, item.val >= 75 ? 148 : 38, item.val >= 75 ? 136 : 38);
        doc.text(`${item.val}%`, cellX + 44, currentY + 5.2);

        cellX += 62;
      });

      currentY += 16;

      // 4. Future Health Predictions (Gemini AI)
      checkPageOverflow(40);
      drawSectionHeader('Future Wellness Trend Predictions');

      const pred = data.predictions || {};
      const trends = [
        { title: 'Weight Outlook (30 Days)', text: pred.weightTrend || 'Awaiting metrics.' },
        { title: 'Sleep Quality Projection', text: pred.sleepQuality || 'Awaiting metrics.' },
        { title: 'Stress & Cortisol forecast', text: pred.stressLevel || 'Awaiting metrics.' },
        { title: 'Hydration Target Prediction', text: pred.hydrationPrediction || 'Awaiting metrics.' }
      ];

      trends.forEach((t) => {
        checkPageOverflow(16);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(t.title, margin, currentY);
        currentY += 4;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(75, 85, 99);
        const splitText = doc.splitTextToSize(t.text, contentWidth);
        doc.text(splitText, margin, currentY);
        currentY += (splitText.length * 4.2) + 4;
      });

      // Forecast Summary Box
      checkPageOverflow(25);
      doc.setFillColor(245, 243, 255); // light violet
      doc.setDrawColor(216, 180, 254);
      doc.rect(margin, currentY, contentWidth, 18, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(109, 40, 217);
      doc.text('30-DAY DIGITAL FORECAST SUMMARY', margin + 4, currentY + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(76, 29, 149);
      const foreSplit = doc.splitTextToSize(pred.monthlyForecast || 'Regular workout will increase stamina.', contentWidth - 8);
      doc.text(foreSplit, margin + 4, currentY + 10);

      currentY += 24;

      // 5. Daily Recommendations (Force Page Break)
      doc.addPage();
      currentY = 15;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Page 2 - AI Digital Health Twin Report`, margin, 287);

      drawSectionHeader('AI Daily Health Twin Actionable Goals');
      
      const rec = data.recommendations || {};
      const goals = [
        { label: 'Cardio Workout Goal', val: rec.workout || 'Brisk walking 20 mins' },
        { label: 'Mindful Yoga Posture', val: rec.yoga || 'Mountain Pose' },
        { label: 'Mental Meditation Target', val: rec.meditation || 'Breathing exercises' },
        { label: 'Hydration Water Limit', val: rec.waterGoal || '2.5L' },
        { label: 'Nutrient Intake Diet', val: rec.healthyFood || 'Salad & high protein' },
        { label: 'Sleep & Stress Strategy', val: `${rec.sleepGoal || '8h'} | ${rec.stressManagement || 'Rest intervals'}` }
      ];

      goals.forEach((goal) => {
        checkPageOverflow(14);
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.setDrawColor(borderTheme[0], borderTheme[1], borderTheme[2]);
        doc.rect(margin, currentY, contentWidth, 10, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(goal.label, margin + 4, currentY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(75, 85, 99);
        const textValSplit = doc.splitTextToSize(goal.val, contentWidth - 65);
        doc.text(textValSplit, margin + 55, currentY + 6);

        currentY += 12;
      });

      // 6. Achievements Summary
      if (data.achievements && data.achievements.length > 0) {
        checkPageOverflow(25);
        drawSectionHeader('Earned Digital Badges & Milestones');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        
        let badX = margin;
        data.achievements.forEach((ach: any) => {
          const title = ach.title;
          const textWidth = doc.getTextWidth(title) + 6;
          if (badX + textWidth > pageWidth - margin) {
            badX = margin;
            currentY += 6;
            checkPageOverflow(10);
          }
          
          doc.setFillColor(254, 253, 237); // yellow badge bg
          doc.setDrawColor(254, 240, 138);
          doc.rect(badX, currentY, textWidth - 2, 5, 'FD');
          doc.setTextColor(161, 98, 7); // brown
          doc.text(title, badX + 2, currentY + 3.8);
          
          badX += textWidth;
        });
        currentY += 10;
      }

      // 7. Timeline Excerpts
      if (data.timeline && data.timeline.length > 0) {
        checkPageOverflow(30);
        drawSectionHeader('Recent Timeline Logs');

        data.timeline.slice(0, 5).forEach((item: any) => {
          checkPageOverflow(14);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          const dStr = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          doc.text(`[${item.eventType.toUpperCase()}] ${dStr}`, margin, currentY);
          
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
          doc.text(item.title, margin + 40, currentY);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(107, 114, 128);
          doc.text(item.value || '', pageWidth - margin - doc.getTextWidth(item.value || '') - 2, currentY);

          currentY += 4;
          const descSplit = doc.splitTextToSize(item.description || '', contentWidth - 42);
          doc.text(descSplit, margin + 40, currentY);
          currentY += (descSplit.length * 4) + 2;
        });
      }

      // 8. Medical Education Disclaimer
      checkPageOverflow(26);
      currentY = 255;
      doc.setFillColor(254, 242, 242); // light red
      doc.setDrawColor(252, 165, 165);
      doc.rect(margin, currentY, contentWidth, 18, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(153, 27, 27);
      doc.text('⚠️ MEDICAL EDUCATION DISCLAIMER', margin + 4, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(185, 28, 28);
      const disclaimer = 'This AI Health Twin provides wellness insights for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified physician or healthcare provider before initiating or terminating medical therapies.';
      const discSplit = doc.splitTextToSize(disclaimer, contentWidth - 8);
      doc.text(discSplit, margin + 4, currentY + 8);

      doc.save(`AI_Health_Twin_Report_${data.profile.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('[PdfService] Error generating Health Twin PDF:', err);
      throw err;
    }
  }
}

