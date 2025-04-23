from flask import Flask, request, jsonify, render_template, session, make_response,send_file
from flask_cors import CORS
import joblib
import pandas as pd
import sqlite3
import json
import os
from reportlab.lib.pagesizes import A4
import traceback
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import io
from io import BytesIO
from reportlab.lib import colors

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)
app.secret_key = os.urandom(24)  # Required for session storage

# Database configuration
DATABASE = 'patient_metadata.db'

def get_db():
    """Create and return a database connection."""
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db

def init_db():
    """Initialize the database with required tables."""
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        cursor.execute(''' 
            CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                age INTEGER,
                gender TEXT,
                family_history TEXT,
                symptoms TEXT,
                previous_cancer TEXT,
                clinical_data TEXT,
                prediction_result TEXT,
                confidence TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        db.commit()
        db.close()

init_db()  # Ensure DB is initialized on startup

def fetch_patient_data(patient_id):
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT * FROM patients WHERE id = ?', (patient_id,))
        patient_data = cursor.fetchone()
        db.close()

        if patient_data:
            # Return the patient data as a dictionary
            return {
                'id': patient_data['id'],
                'name': patient_data['name'],
                'age': patient_data['age'],
                'gender': patient_data['gender'],
                'family_history': patient_data['family_history'],
                'previous_cancer': patient_data['previous_cancer'],
                'clinical_data': json.loads(patient_data['clinical_data']),
                'prediction_result': patient_data['prediction_result'],
                'confidence': patient_data['confidence'],
                'timestamp': patient_data['timestamp']
            }
        else:
            return None
    except Exception as e:
        print(f"Error fetching patient data: {e}")
        return None

# Load the ML model
try:
    model = joblib.load('breast_cancer_model.pkl')
    REQUIRED_FEATURES = model.feature_names_in_.tolist()
    print(f"✅ Model loaded successfully. Required features: {REQUIRED_FEATURES}")
except Exception as e:
    print(f"❌ Error loading model: {str(e)}")
    raise

@app.route('/')
def home():
    """Render the main diagnosis page."""
    return render_template('indexbreastcancer.html')

@app.route('/chatbot')
def chatbot():
    """Render chatbot page with patient data."""
    patient_data = session.get('last_diagnosis')

    if not patient_data:
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT * FROM patients ORDER BY timestamp DESC LIMIT 1')
        patient = cursor.fetchone()
        db.close()

        if patient:
            patient_data = {
                'name': patient['name'],
                'age': patient['age'],
                'gender': patient['gender'],
                'family_history': patient['family_history'],
                'previous_cancer': patient['previous_cancer'],
                'diagnosis': patient['prediction_result'],
                'clinical_data': json.loads(patient['clinical_data']),
                'confidence': patient['confidence']
            }

    return render_template('chatbot.html', patient_data=patient_data or {})

@app.route('/api/refresh-patient-data', methods=['GET'])
def refresh_patient_data():
    """Fetch the latest patient data."""
    try:
        # Check session first
        if 'last_diagnosis' in session:
            print('Returning data from session:', session['last_diagnosis'])  # Log session data
            return jsonify(session['last_diagnosis'])

        # Fallback to database
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT * FROM patients ORDER BY timestamp DESC LIMIT 1')
        patient = cursor.fetchone()
        db.close()

        if not patient:
            print('No patient data found in database')
            return jsonify({'error': 'No patient data found'}), 404

        print('Fetched patient data:', patient)  # Log the patient data fetched from DB

        # Ensure prediction_result is not empty or None
        diagnosis = patient.get('prediction_result', 'Unknown')
        if not diagnosis:
            diagnosis = 'Unknown'

        patient_data = {
            'id': patient['id'],
            'name': patient['name'],
            'age': patient['age'],
            'gender': patient['gender'],
            'family_history': patient['family_history'],
            'previous_cancer': patient['previous_cancer'],
            'diagnosis': diagnosis,
            'clinical_data': json.loads(patient['clinical_data']),
            'confidence': patient['confidence'],
            'timestamp': patient['timestamp']
        }

        print('Returning patient data:', patient_data)  # Log the full response being returned

        return jsonify(patient_data)

    except Exception as e:
        print('Error fetching patient data:', e)
        return jsonify({
            'error': 'Failed to fetch patient data',
            'details': str(e)
        }), 500
    
@app.route("/generate-report", methods=['POST'])
def generate_report():
    try:
        data = request.get_json()
        
        # Create PDF buffer
        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=A4, leftMargin=50, rightMargin=50, topMargin=50, bottomMargin=50)
        
        # Register fonts - using a more professional font for reports
        # Ensure these font files are in your project directory or specify the full path
        pdfmetrics.registerFont(TTFont('Calibri', 'Calibri.ttf'))
        pdfmetrics.registerFont(TTFont('Calibri-Bold', 'calibrib.ttf'))
        # Optional: Add italic if you have the font file
        try:
            pdfmetrics.registerFont(TTFont('Calibri-Italic', 'calibrii.ttf'))
        except:
            pass  # Fall back to Calibri if Italic is not available
        
        # Prepare data from the request
        patient_name = data.get('name', 'Patient')
        age = data.get('age', 'N/A')
        gender = data.get('gender', 'N/A')
        diagnosis = data.get('prediction', 'Unknown')
        clinical_data = data.get('clinical_data', {})
        report_date = datetime.now().strftime("%Y-%m-%d")
        
        # Choose a single pastel color theme for the whole report
        # Using a soft blue-green pastel (#83C5BE) as the primary color
        primary_color = colors.HexColor('#83C5BE')
        secondary_color = colors.HexColor('#EDF6F9')  # Very light blue-gray for backgrounds
        accent_color = colors.HexColor('#006D77')  # Darker version for headers
        highlight_color = colors.HexColor('#FFDDD2')  # Light peach for highlights
        
        # Calculate risk score using provided formula
        concave_points_worst = clinical_data.get('concave_points_worst', 0)
        concavity_mean = clinical_data.get('concavity_mean', 0)
        radius_worst = clinical_data.get('radius_worst', 0)
        
        risk_score = ((concave_points_worst + concavity_mean + radius_worst) / 3) * 100
        
        # Get top 3 most significant features
        top_features = get_top_features(clinical_data, 3)
        
        # Create PDF content
        styles = getSampleStyleSheet()
        
        # Create custom styles with improved formatting and consistent color scheme
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontName='Calibri-Bold',
            fontSize=18,  # Reduced size to save space
            alignment=TA_CENTER,
            spaceAfter=16,
            textColor=accent_color
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontName='Calibri-Bold',
            fontSize=12,  # Reduced size to save space
            spaceBefore=14,
            spaceAfter=8,
            textColor=accent_color
        )
        
        subheading_style = ParagraphStyle(
            'CustomSubheading',
            parent=styles['Heading3'],
            fontName='Calibri-Bold',
            fontSize=11,
            spaceBefore=8,
            spaceAfter=6,
            textColor=accent_color
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontName='Calibri',
            fontSize=10,  # Reduced size to save space
            spaceBefore=4,
            spaceAfter=4,
            leading=12  # Reduced line spacing to save space
        )
        
        normal_style_black = ParagraphStyle(
            'CustomNormalBlack',
            parent=styles['Normal'],
            fontName='Calibri',
            fontSize=10,
            spaceBefore=4,
            spaceAfter=4,
            textColor=colors.black,
            leading=12
        )
        
        bullet_style = ParagraphStyle(
            'CustomBullet',
            parent=styles['Normal'],
            fontName='Calibri',
            fontSize=10,
            spaceBefore=2,
            spaceAfter=2,
            leftIndent=20,
            bulletIndent=10,
            leading=12
        )
        
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontName='Calibri',
            fontSize=8,
            textColor=colors.darkgray,
            alignment=TA_CENTER
        )
        
        elements = []
        
        # 1. Title and Patient Information
        elements.append(Paragraph("BREAST CANCER DIAGNOSTIC REPORT", title_style))
        
        # Add a horizontal line after title (using a Table with a colored background)
        hr_line = Table([[""]],
                     colWidths=[doc.width],
                     rowHeights=[2])
        hr_line.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), primary_color),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(hr_line)
        elements.append(Spacer(1, 12))
        
        elements.append(Paragraph("1. PATIENT INFORMATION", heading_style))
        
        # Create a boxed patient information layout with improved styling - labels and values bold
        patient_data = [
            [Paragraph("<b>Name:</b> <b>" + patient_name + "</b>", normal_style), 
             Paragraph("<b>Age:</b> <b>" + str(age) + "</b>", normal_style), 
             Paragraph("<b>Gender:</b> <b>" + gender + "</b>", normal_style)],
            [Paragraph("<b>Diagnosis:</b> <b>" + diagnosis + "</b>", normal_style), 
             Paragraph("<b>Date:</b> <b>" + report_date + "</b>", normal_style), ""]
        ]
        
        # Modified layout - improved spacing
        patient_table = Table(patient_data, colWidths=[180, 160, 140])
        patient_table.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,-1), 'Calibri'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
            ('BOX', (0,0), (-1,-1), 1, primary_color),
            ('BACKGROUND', (0,0), (-1,-1), secondary_color),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 15),
            ('RIGHTPADDING', (0,0), (-1,-1), 15),
            ('SPAN', (1, 1), (2, 1)),  # Span the Date cell to fix layout
        ]))
        elements.append(patient_table)
        elements.append(Spacer(1, 12))
        
        # 2. Clinical Input Data with prediction-focused explanations - feature names bold
        elements.append(Paragraph("2. CLINICAL INPUT DATA", heading_style))
        
        clinical_items = [["Feature", "Value", "Prediction Impact"]]
        
        feature_explanations = {
            "radius_mean": "Larger values suggest potential malignancy",
            "texture_mean": "Higher values indicate irregular cell structure",
            "perimeter_mean": "Larger perimeter correlates with abnormal growth",
            "area_mean": "Increased area is a key malignancy indicator",
            "smoothness_mean": "Higher values suggest cell membrane abnormality",
            "compactness_mean": "Greater compactness indicates malignant tendency",
            "concavity_mean": "Strong predictor of cell boundary irregularity",
            "concave_points_mean": "Critical indicator of invasive potential",
            "symmetry_mean": "Asymmetry suggests abnormal cell development",
            "fractal_dimension_mean": "Higher complexity often indicates malignancy",
            "radius_worst": "Strong predictor - larger worst case indicates risk",
            "texture_worst": "High texture variance strongly predicts malignancy",
            "perimeter_worst": "Large worst perimeter strongly indicates cancer",
            "area_worst": "One of the strongest predictors of malignancy",
            "smoothness_worst": "Extreme values suggest abnormal cell surface",
            "compactness_worst": "High compactness extremes predict malignancy",
            "concavity_worst": "Key predictor of invasive characteristics",
            "concave_points_worst": "Critical predictor of boundary irregularity",
            "symmetry_worst": "Extreme asymmetry suggests aggressive growth",
            "fractal_dimension_worst": "Complex boundaries suggest malignancy"
        }
        
        for key, value in clinical_data.items():
            explanation = feature_explanations.get(key, "Contributes to overall prediction model")
            # Make feature names bold and ensure they stay bold in table
            clinical_items.append([Paragraph(f"<b>{key}</b>", normal_style), str(round(value, 4)), explanation])
        
        clinical_table = Table(clinical_items, colWidths=[150, 100, 220])
        clinical_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), primary_color),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
            ('FONTNAME', (0,0), (-1,-1), 'Calibri'),
            ('FONTNAME', (0,0), (-1,0), 'Calibri-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),  # Smaller font to fit in 2 pages
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),  # Reduced padding
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [secondary_color, colors.white]),
        ]))
        elements.append(clinical_table)
        elements.append(Spacer(1, 10))
        
        # 3. Clinical Snapshot - with bold clinical values
        elements.append(Paragraph("3. YOUR CLINICAL SNAPSHOT", heading_style))
        
        # Display top 3 significant features
        elements.append(Paragraph("Top 3 Significant Features:", subheading_style))
        
        # Create top features section with bold feature names AND values
        for feature, value in top_features:
            formatted_value = round(value, 3)
            if "concave_points" in feature and value > 0.1:
                elements.append(Paragraph(f"<b>{feature}</b> of <b>{formatted_value}</b> - Elevated concave points suggest abnormal curvature in cell structure", normal_style))
            elif "radius" in feature and value > 15:
                elements.append(Paragraph(f"<b>{feature}</b> of <b>{formatted_value}</b> - Increased radius indicates larger than normal cell size", normal_style))
            elif "area" in feature and value > 800:
                elements.append(Paragraph(f"<b>{feature}</b> of <b>{formatted_value}</b> - Enlarged area measurement suggests abnormal cell growth", normal_style))
            elif "perimeter" in feature and value > 100:
                elements.append(Paragraph(f"<b>{feature}</b> of <b>{formatted_value}</b> - Extended perimeter indicates larger boundary of the cells", normal_style))
            elif "texture" in feature and value > 20:
                elements.append(Paragraph(f"<b>{feature}</b> of <b>{formatted_value}</b> - Higher texture variation shows cellular structural irregularity", normal_style))
            else:
                elements.append(Paragraph(f"<b>{feature}</b> of <b>{formatted_value}</b> - Notable indicator for diagnostic assessment", normal_style))
        
        elements.append(Spacer(1, 10))
        
        # 4. Risk Score and Category
        elements.append(Paragraph("4. RISK SCORE AND CATEGORY", heading_style))
        
        # Determine risk category based on score
        risk_score_formatted = round(risk_score, 1)
        
        if risk_score < 500:
            risk_level = "Normal"
            risk_color = primary_color  # Use primary color for normal
            if diagnosis.lower() == 'benign':
                risk_note = "Your risk profile is within normal range. Continue routine screenings."
            else:
                risk_note = "Despite low risk score, follow recommended treatment due to diagnosis."
        else:
            risk_level = "Elevated"
            risk_color = colors.HexColor('#E76F51')  # Salmon color for elevated risk
            if diagnosis.lower() == 'malignant':
                risk_note = "Your elevated risk score requires immediate medical attention."
            else:
                risk_note = "Further testing recommended due to elevated risk indicators."
        
        # Create a highlighted risk information box
        risk_data = [
            [Paragraph("<b>RISK ASSESSMENT</b>", normal_style)],
            [Paragraph(f"<b>Score:</b> {risk_score_formatted}%", normal_style)],
            [Paragraph(f"<b>Status:</b> {risk_level}", normal_style)],
            [Paragraph(f"<b>Assessment:</b> {risk_note}", normal_style)]
        ]
        
        risk_box = Table(risk_data, colWidths=[470])
        
        risk_box.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,0), risk_color),
            ('BACKGROUND', (0,1), (0,-1), secondary_color),
            ('TEXTCOLOR', (0,0), (0,0), colors.white),
            ('FONTNAME', (0,0), (0,0), 'Calibri-Bold'),
            ('ALIGNMENT', (0,0), (0,0), 'CENTER'),
            ('BOX', (0,0), (-1,-1), 1, risk_color),
            ('FONTSIZE', (0,0), (0,0), 11),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 15),
            ('RIGHTPADDING', (0,0), (-1,-1), 15),
        ]))
        elements.append(risk_box)
        elements.append(Spacer(1, 6))
        
        elements.append(Paragraph("Estimated from clinical features like concavity, perimeter, etc.", normal_style))
        elements.append(Paragraph("A score > 500% indicates high risk. Normal range: <500%", normal_style))
        elements.append(Spacer(1, 10))
        
        # 5. Age & Gender-Based Guidance - More personalized, with patient name in sentence instead of bullet
        elements.append(Paragraph("5. AGE & GENDER-BASED GUIDANCE", heading_style))
        
        # Personalized age and gender guidance
        if gender.lower() == 'female':
            if int(age) < 40:
                elements.append(Paragraph(f"At {age} years old as a woman, your risk of breast cancer is lower than older age groups, but vigilance is still important:", normal_style))
                # Add patient name recommendation as normal text instead of bullet point
                elements.append(Paragraph(f"<b>{patient_name}</b>, we recommend clinical breast examinations every 1-3 years at your age of {age}.", normal_style))
                guidance_points = [
                    "Learn and practice monthly breast self-examinations - early detection is key",
                    "Discuss your family history with your doctor to identify any hereditary risk factors"
                ]
            elif int(age) < 50:
                elements.append(Paragraph(f"At {age} years old as a woman, you're entering a period where regular screening becomes increasingly important:", normal_style))
                # Add patient name recommendation as normal text instead of bullet point
                elements.append(Paragraph(f"<b>{patient_name}</b>, we strongly recommend annual mammograms starting at your current age of {age}.", normal_style))
                guidance_points = [
                    "Continue monthly breast self-examinations to monitor any changes",
                    "Consider digital mammography which may be more effective for your age group"
                ]
            else:
                elements.append(Paragraph(f"At {age} years old as a woman, your age group has an increased risk that requires diligent monitoring:", normal_style))
                # Add patient name recommendation as normal text instead of bullet point
                elements.append(Paragraph(f"<b>{patient_name}</b>, at {age}, annual mammograms are essential - schedule your next one promptly.", normal_style))
                guidance_points = [
                    "Consider additional screening methods like breast MRI if you have other risk factors",
                    "Maintain regular clinical examinations every 6-12 months"
                ]
        elif gender.lower() == 'male':
            elements.append(Paragraph(f"As a {age}-year-old man, breast cancer is rare but still possible:", normal_style))
            # Add patient name recommendation as normal text instead of bullet point
            elements.append(Paragraph(f"<b>{patient_name}</b>, even as a male at {age}, be aware of any unusual changes to chest tissue.", normal_style))
            guidance_points = [
                "Discuss any family history of breast cancer (especially in male relatives) with your doctor",
                "Regular physical examinations are recommended to monitor overall health"
            ]
        else:
            elements.append(Paragraph(f"Based on your age of {age}, we recommend:", normal_style))
            # Add patient name recommendation as normal text instead of bullet point
            elements.append(Paragraph(f"<b>{patient_name}</b>, regular breast health monitoring is appropriate for your age of {age}.", normal_style))
            guidance_points = [
                "Discuss personalized screening recommendations with your healthcare provider",
                "Be aware of any changes in breast tissue and report them promptly"
            ]
        
        for point in guidance_points:
            elements.append(Paragraph(f"• {point}", bullet_style))
        
        elements.append(Spacer(1, 10))
        
        # 6. Lifestyle & Nutrition Recommendations - DIFFERENT BASED ON DIAGNOSIS
        elements.append(Paragraph("6. LIFESTYLE & NUTRITION RECOMMENDATIONS", heading_style))
        
        lifestyle_points = []
        
        if diagnosis.lower() == 'malignant':
            lifestyle_points.extend([
                "Prioritize a plant-based diet rich in cruciferous vegetables, berries, and leafy greens",
                "Include sources of omega-3 fatty acids such as flaxseeds, walnuts, and fatty fish",
                "Strictly limit alcohol consumption and avoid tobacco products entirely",
                "Maintain moderate physical activity (with physician approval) - aim for gentle exercise like walking",
                "Consider joining a cancer nutrition program for personalized dietary guidance",
                "Stay well-hydrated with filtered water and herbal teas without added sugars",
                "Minimize exposure to environmental toxins and chemicals in personal care products"
            ])
        else:  # Benign
            lifestyle_points.extend([
                "Maintain a balanced Mediterranean-style diet rich in fruits, vegetables, and whole grains",
                "Limit alcohol consumption to reduce breast cancer risk (no more than one drink per day)",
                "Maintain healthy weight through balanced nutrition and regular exercise",
                "Incorporate regular physical activity for at least 150 minutes per week",
                "Ensure adequate vitamin D through sun exposure or supplements (with physician guidance)",
                "Practice stress reduction techniques like meditation, yoga, or mindfulness",
                "Get sufficient sleep (7-8 hours nightly) to support immune function"
            ])
        
        for point in lifestyle_points:
            elements.append(Paragraph(f"• {point}", bullet_style))
        
        elements.append(Spacer(1, 10))
        
        # 7. Monitoring & Follow-Up - DIFFERENT BASED ON DIAGNOSIS
        elements.append(Paragraph("7. MONITORING & FOLLOW-UP", heading_style))
        
        followup_points = []
        
        if diagnosis.lower() == 'malignant':
            followup_points.extend([
                "Schedule appointment with oncologist within one week for treatment planning",
                "Prepare for additional diagnostic imaging (MRI, PET scan) as recommended",
                "Discuss surgical options and timing with breast cancer surgeon",
                "Consider genetic testing for treatment planning if not already completed",
                "Schedule consultation with radiation and medical oncology teams",
                "Keep detailed journal of symptoms, side effects, and questions for medical team",
                "Look into clinical trial opportunities that may be appropriate for your specific diagnosis",
                "Meet with patient navigator to coordinate appointments and support services"
            ])
        else:  # Benign
            followup_points.extend([
                "Follow up with your physician in 6 months for clinical breast examination",
                "Schedule next mammogram according to age-appropriate guidelines (typically annually)",
                "Consider supplemental screening with ultrasound if you have dense breast tissue",
                "Report any changes in breast tissue or symptoms immediately to your doctor",
                "Maintain records of all imaging and examination results for comparison over time",
                "Continue or establish regular breast self-examination routine",
                "Annual risk re-evaluation with your healthcare provider",
                "Consider consultation with genetic counselor if you have family history of breast cancer"
            ])
        
        for point in followup_points:
            elements.append(Paragraph(f"• {point}", bullet_style))
        
        elements.append(Spacer(1, 10))
        
        # 8. Support Resources - numbered list
        elements.append(Paragraph("8. SUPPORT RESOURCES", heading_style))
        
        support_resources = [
            ("American Cancer Society:", "https://www.cancer.org", "Comprehensive cancer information and support services"),
            ("National Cancer Institute:", "https://www.cancer.gov", "Government resource for cancer research and patient support"),
            ("Breast Cancer Research Foundation:", "https://www.bcrf.org", "Research updates and patient resources"),
            ("National Cancer Helpline:", "1-800-227-2345", "24/7 assistance and guidance")
        ]
        
        # Using numbered list
        for i, (name, url, description) in enumerate(support_resources, 1):
            if "Helpline" in name:
                elements.append(Paragraph(f"{i}. <b>{name}</b> {url} - {description}", normal_style_black))
            else:
                elements.append(Paragraph(f"{i}. <b>{name}</b> {url} - {description}", normal_style_black))
        
        elements.append(Spacer(1, 10))
        
        # 9. Additional Information - condensed for space
        elements.append(Paragraph("9. ADDITIONAL INFORMATION", heading_style))
        
        # Create a framed advisory box
        advisory = """This report is intended to serve as a supplemental tool for breast cancer screening and risk assessment. 
        It is not a replacement for professional medical advice, diagnosis, or treatment. Always seek the advice of your 
        physician with any questions regarding your medical condition or the results presented in this report."""
        
        advisory_paragraph = Paragraph(advisory, normal_style)
        
        advisory_frame = Table([[advisory_paragraph]], colWidths=[470])
        advisory_frame.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 1, primary_color),
            ('BACKGROUND', (0,0), (-1,-1), secondary_color),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        
        elements.append(advisory_frame)
        elements.append(Spacer(1, 10))
        
        # Add dividing line before footer using a Table instead of HRFlowable
        hr_footer = Table([[""]],
                  colWidths=[doc.width],
                  rowHeights=[1])
        hr_footer.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(hr_footer)
        elements.append(Spacer(1, 4))
        
        # 10. Report Footer
        footer_text = f"Report generated for: {patient_name} | Date: {report_date} | CONFIDENTIAL MEDICAL INFORMATION"
        elements.append(Paragraph(footer_text, footer_style))
        
        # Build PDF
        doc.build(elements)
        pdf_buffer.seek(0)
        
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=f"breast_cancer_report_{patient_name}.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error generating PDF: {str(e)}")
        return jsonify({"error": str(e)}), 500


def get_top_features(clinical_data, num_features=3):
    """
    Get the top N most significant features based on relative values.
    For simplicity, we're using 'worst' features as they typically have more significance.
    """
    # Define important feature patterns to prioritize
    important_patterns = ['_worst', 'concave_points', 'area', 'radius', 'perimeter']
    
    # Extract and sort features
    features = []
    for key, value in clinical_data.items():
        # Calculate importance score - higher for important patterns
        importance = 0
        for pattern in important_patterns:
            if pattern in key:
                importance += 1
        
        # Add tuple (key, value, importance)
        features.append((key, value, importance))
    
    # Sort by importance (descending) and then by value (descending)
    features.sort(key=lambda x: (x[2], x[1]), reverse=True)
    
    # Return top N features (without the importance score)
    return [(f[0], f[1]) for f in features[:num_features]]

@app.route("/get_previous_metrics")
def get_previous_metrics():
    patient_id = request.args.get("patient_id")

    if not patient_id:
        return jsonify({"error": "patient_id is required"}), 400

    # Fetch patient data
    patient_data = fetch_patient_data(patient_id)

    if patient_data:
        # Return the patient data as a JSON response
        return jsonify(patient_data)
    else:
        return jsonify({"error": "No data found for the given patient_id"}), 404

@app.route('/predict', methods=['POST'])
def predict():
    """Handle prediction requests with validation."""
    try:
        data = request.get_json(force=True)

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # ===== Validate Clinical Data =====
        clinical_data = {}
        missing_fields = []
        invalid_fields = []

        for feature in REQUIRED_FEATURES:
            if feature not in data:
                missing_fields.append(feature)
                continue
            try:
                clinical_data[feature] = float(data[feature])
            except (ValueError, TypeError):
                invalid_fields.append(feature)

        if missing_fields:
            return jsonify({'error': 'Missing required fields', 'fields': missing_fields}), 400

        if invalid_fields:
            return jsonify({'error': 'Invalid values', 'fields': invalid_fields, 'message': 'All fields must be numeric'}), 400

        # ===== Extract Patient Metadata =====
        patient_metadata = {
            'name': data.get('patient_name', 'Anonymous'),
            'age': int(data.get('age', 0)) if data.get('age') else None,
            'gender': data.get('gender'),
            'family_history': data.get('family_history'),
            'symptoms': data.get('symptoms'),
            'previous_cancer': data.get('previous_cancer')
        }

        # ===== Make Prediction =====
        input_df = pd.DataFrame([clinical_data], columns=REQUIRED_FEATURES)
        prediction = model.predict(input_df)[0]
        probabilities = model.predict_proba(input_df)[0]

        # Prepare diagnosis results
        is_malignant = prediction == 'M'
        diagnosis = 'Malignant (M)' if is_malignant else 'Benign (B)'
        confidence = max(probabilities) * 100
        malignant_prob = f"{probabilities[0]*100:.2f}%"
        benign_prob = f"{probabilities[1]*100:.2f}%"
        message = "⚠️ High risk: Consult a doctor immediately!" if is_malignant else "✅ Low risk: Follow up with medical professionals."

        # ===== Store Results in Database =====
        db = get_db()
        cursor = db.cursor()
        cursor.execute(''' 
            INSERT INTO patients (
                name, age, gender, family_history, symptoms, previous_cancer, 
                clinical_data, prediction_result, confidence, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            patient_metadata['name'],
            patient_metadata['age'],
            patient_metadata['gender'],
            patient_metadata['family_history'],
            patient_metadata['symptoms'],
            patient_metadata['previous_cancer'],
            json.dumps(clinical_data),
            diagnosis,
            f"{confidence:.2f}%",
            datetime.now()
        ))
        db.commit()
        patient_id = cursor.lastrowid
        db.close()

        # ===== Store in Session for Chatbot =====
        session['last_diagnosis'] = {
            'id': patient_id,
            **patient_metadata,
            'clinical_data': clinical_data,
            'diagnosis': diagnosis,
            'confidence': f"{confidence:.2f}%",
            'malignant_prob': malignant_prob,
            'benign_prob': benign_prob,
            'message': message
        }

        return jsonify({
            'diagnosis': diagnosis,
            'message': message,
            'confidence': f"{confidence:.2f}%",
            'malignant_prob': malignant_prob,
            'benign_prob': benign_prob,
            'status': 'success'
        })

    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        return jsonify({'error': 'Prediction failed', 'details': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
