import mongoose from 'mongoose';
import 'dotenv/config';
import Hospital from '../models/Hospital.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import PrescriptionRefill from '../models/PrescriptionRefill.js';
import connectDB from '../config/db.js';

const syncAllToFHIR = async () => {
    try {
        console.log('🚀 Starting FHIR synchronization...\n');

        // Connect to MongoDB
        await connectDB();

        // ==================== SYNC HOSPITALS ====================
        console.log('🏥 Syncing Hospitals to FHIR...');
        const hospitals = await Hospital.find({});
        console.log(`Found ${hospitals.length} hospitals to sync`);

        let hospitalSuccess = 0;
        let hospitalFailed = 0;

        for (const hospital of hospitals) {
            try {
                if (hospital.fhirSyncStatus !== 'synced') {
                    const result = await hospital.syncToFHIR();
                    if (result.success) {
                        hospitalSuccess++;
                        console.log(`✅ Hospital synced: ${hospital.name} (FHIR ID: ${hospital.fhirId})`);
                    } else {
                        hospitalFailed++;
                        console.error(`❌ Failed to sync hospital ${hospital._id}:`, result.error);
                    }
                } else {
                    console.log(`⏭️  Hospital already synced: ${hospital.name}`);
                }
            } catch (error) {
                hospitalFailed++;
                console.error(`❌ Error syncing hospital ${hospital._id}:`, error.message);
            }
        }

        console.log(`\n📊 Hospitals: ${hospitalSuccess} synced, ${hospitalFailed} failed\n`);

        // ==================== SYNC PATIENTS ====================
        console.log('👥 Syncing Patients to FHIR...');
        const patients = await Patient.find({});
        console.log(`Found ${patients.length} patients to sync`);

        let patientSuccess = 0;
        let patientFailed = 0;

        for (const patient of patients) {
            try {
                if (patient.fhirSyncStatus !== 'synced') {
                    const result = await patient.syncToFHIR();
                    if (result.success) {
                        patientSuccess++;
                        console.log(`✅ Patient synced: ${patient.firstName} ${patient.lastName} (FHIR ID: ${patient.fhirId})`);
                    } else {
                        patientFailed++;
                        console.error(`❌ Failed to sync patient ${patient._id}:`, result.error);
                    }
                } else {
                    console.log(`⏭️  Patient already synced: ${patient.firstName} ${patient.lastName}`);
                }
            } catch (error) {
                patientFailed++;
                console.error(`❌ Error syncing patient ${patient._id}:`, error.message);
            }
        }

        console.log(`\n📊 Patients: ${patientSuccess} synced, ${patientFailed} failed\n`);

        // ==================== SYNC DOCTORS ====================
        console.log('👨‍⚕️ Syncing Doctors to FHIR...');
        const doctors = await Doctor.find({});
        console.log(`Found ${doctors.length} doctors to sync`);

        let doctorSuccess = 0;
        let doctorFailed = 0;

        for (const doctor of doctors) {
            try {
                if (doctor.fhirSyncStatus !== 'synced') {
                    const result = await doctor.syncToFHIR();
                    if (result.success) {
                        doctorSuccess++;
                        console.log(`✅ Doctor synced: ${doctor.name} (FHIR ID: ${doctor.fhirId})`);
                    } else {
                        doctorFailed++;
                        console.error(`❌ Failed to sync doctor ${doctor._id}:`, result.error);
                    }
                } else {
                    console.log(`⏭️  Doctor already synced: ${doctor.name}`);
                }
            } catch (error) {
                doctorFailed++;
                console.error(`❌ Error syncing doctor ${doctor._id}:`, error.message);
            }
        }

        console.log(`\n📊 Doctors: ${doctorSuccess} synced, ${doctorFailed} failed\n`);

        // ==================== SYNC APPOINTMENTS ====================
        console.log('📅 Syncing Appointments to FHIR...');
        const appointments = await Appointment.find({})
            .populate('patient')
            .populate('doctor');
        console.log(`Found ${appointments.length} appointments to sync`);

        let appointmentSuccess = 0;
        let appointmentFailed = 0;
        let appointmentSkipped = 0;

        for (const appointment of appointments) {
            try {
                // Check if patient and doctor have FHIR IDs
                if (!appointment.patient?.fhirId || !appointment.doctor?.fhirId) {
                    appointmentSkipped++;
                    console.log(`⏭️  Skipping appointment ${appointment._id}: Patient or Doctor not in FHIR`);
                    continue;
                }

                if (appointment.fhirSyncStatus !== 'synced') {
                    const result = await appointment.syncToFHIR();
                    if (result.success) {
                        appointmentSuccess++;
                        console.log(`✅ Appointment synced: ${appointment.patient.firstName} ${appointment.patient.lastName} with ${appointment.doctor.name} (FHIR ID: ${appointment.fhirId})`);
                    } else {
                        appointmentFailed++;
                        console.error(`❌ Failed to sync appointment ${appointment._id}:`, result.error);
                    }
                } else {
                    console.log(`⏭️  Appointment already synced: ${appointment._id}`);
                }
            } catch (error) {
                appointmentFailed++;
                console.error(`❌ Error syncing appointment ${appointment._id}:`, error.message);
            }
        }

        console.log(`\n📊 Appointments: ${appointmentSuccess} synced, ${appointmentFailed} failed, ${appointmentSkipped} skipped\n`);

        // ==================== SYNC PRESCRIPTIONS ====================
        console.log('💊 Syncing Prescriptions to FHIR...');
        const prescriptions = await PrescriptionRefill.find({})
            .populate('patient')
            .populate('prescribingDoctor');
        console.log(`Found ${prescriptions.length} prescriptions to sync`);

        let prescriptionSuccess = 0;
        let prescriptionFailed = 0;
        let prescriptionSkipped = 0;

        for (const prescription of prescriptions) {
            try {
                // Check if patient and doctor have FHIR IDs
                if (!prescription.patient?.fhirId || !prescription.prescribingDoctor?.fhirId) {
                    prescriptionSkipped++;
                    console.log(`⏭️  Skipping prescription ${prescription._id}: Patient or Doctor not in FHIR`);
                    continue;
                }

                if (prescription.fhirSyncStatus !== 'synced') {
                    const result = await prescription.syncToFHIR();
                    if (result.success) {
                        prescriptionSuccess++;
                        console.log(`✅ Prescription synced: ${prescription.medicationName} for ${prescription.patient.firstName} ${prescription.patient.lastName} (FHIR ID: ${prescription.fhirId})`);
                    } else {
                        prescriptionFailed++;
                        console.error(`❌ Failed to sync prescription ${prescription._id}:`, result.error);
                    }
                } else {
                    console.log(`⏭️  Prescription already synced: ${prescription._id}`);
                }
            } catch (error) {
                prescriptionFailed++;
                console.error(`❌ Error syncing prescription ${prescription._id}:`, error.message);
            }
        }

        console.log(`\n📊 Prescriptions: ${prescriptionSuccess} synced, ${prescriptionFailed} failed, ${prescriptionSkipped} skipped\n`);

        // ==================== FINAL SUMMARY ====================
        console.log('═'.repeat(60));
        console.log('📋 FINAL SYNCHRONIZATION SUMMARY');
        console.log('═'.repeat(60));
        console.log(`🏥 Hospitals:      ${hospitalSuccess} ✅  ${hospitalFailed} ❌`);
        console.log(`👥 Patients:       ${patientSuccess} ✅  ${patientFailed} ❌`);
        console.log(`👨‍⚕️ Doctors:        ${doctorSuccess} ✅  ${doctorFailed} ❌`);
        console.log(`📅 Appointments:   ${appointmentSuccess} ✅  ${appointmentFailed} ❌  ${appointmentSkipped} ⏭️`);
        console.log(`💊 Prescriptions:  ${prescriptionSuccess} ✅  ${prescriptionFailed} ❌  ${prescriptionSkipped} ⏭️`);
        console.log('═'.repeat(60));

        const totalSuccess = hospitalSuccess + patientSuccess + doctorSuccess + appointmentSuccess + prescriptionSuccess;
        const totalFailed = hospitalFailed + patientFailed + doctorFailed + appointmentFailed + prescriptionFailed;
        const totalSkipped = appointmentSkipped + prescriptionSkipped;

        console.log(`\n🎉 Total: ${totalSuccess} synced, ${totalFailed} failed`);

        if (totalFailed > 0) {
            console.log('\n⚠️  Some items failed to sync. Check the logs above for details.');
            console.log('You can retry failed syncs by calling: POST /api/fhir/retry-failed');
        }

        if (totalSkipped > 0) {
            console.log(`\n⚠️  ${totalSkipped} items were skipped (${appointmentSkipped} appointments, ${prescriptionSkipped} prescriptions) because their patient or doctor is not synced to FHIR.`);
            console.log('Run this script again to sync them after ensuring all patients and doctors are synced.');
        }

        console.log('\n✨ Synchronization complete!\n');

    } catch (error) {
        console.error('💥 Fatal error during synchronization:', error);
        process.exit(1);
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('Database connection closed.');
        process.exit(0);
    }
};
syncAllToFHIR();
