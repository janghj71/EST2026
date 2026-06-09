
import { Routes, Route, Navigate } from "react-router-dom";
import { AlertProvider } from "./alerts";
import { LoadingProvider } from "./loading/LoadingProvider";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AppLayout from "./pages/AppLayout";
import InsuranceEstimate from "./pages/InsuranceEstimate";
import PhotoViewer from "./pages/PhotoViewer";
import PhotoPopup from "./pages/PhotoPopup";
import PhotoMailSend from "./pages/PhotoMailSend";
import SmsSend from "./pages/SmsSend";
import EstimateMemo from "./pages/EstimateMemo";
import DepositPopup from "./pages/DepositPopup";
import BasicSettingsLayout from "./pages/BasicSettingsLayout";
import CompanyInfoPage from "./pages/CompanyInfoPage";
import LaborSettingsPage from "./pages/LaborSettingsPage";
import WorkStatusPage from "./pages/WorkStatusPage";
import InsurersPage from "./pages/InsurersPage";
import InsurerContactsPage from "./pages/InsurerContactsPage";
import UserSettingsPage from "./pages/UserSettingsPage";
import SmsSenderPage from "./pages/SmsSenderPage";
import SmsHistoryPage from "./pages/SmsHistoryPage";
import ChemicalItemsPage from "./pages/ChemicalItemsPage";
import RepairHistorySend from "./pages/RepairHistorySend";
import EstClaimMailSend from "./pages/EstClaimMailSend";
import EstCustomerMailSend from "./pages/EstCustomerMailSend";
import MailHistoryPage from "./pages/MailHistoryPage";
import NoticePage from "./pages/NoticePage";
import NoticeViewPage from "./pages/NoticeViewPage";

import EstimateEditPage from "./pages/estimate/EstimateEditPage";
import LaborItemsPopup from "./pages/estimate/LaborItemsPopup";
import WorkOrderPopup from "./pages/estimate/WorkOrderPopup";
import PaintItemsPopup from "./pages/estimate/PaintItemsPopup";
import ChemicalItemsPopup from "./pages/estimate/ChemicalItemsPopup";
import PartLookupPopup from "./pages/estimate/PartLookupPopup";
import InspectionEstimatePrint from "./prints/InspectionEstimatePrint";
import InspectionStatementPrint from "./prints/InspectionStatementPrint";
import InsuranceClaimPrint from "./prints/InsuranceClaimPrint";
import GeneralRepairClaimPrint from "./prints/GeneralRepairClaimPrint";
import WorkOrderPrint from "./prints/WorkOrderPrint";
import PrivacyConsentPrint from "./prints/PrivacyConsentPrint";
import PrivacyConsentCapturePage from "./prints/PrivacyConsentCapturePage";
import PhotoPrintPage from "./prints/PhotoPrintPage";

export default function App() {
  return (
    <AlertProvider>
      <LoadingProvider>

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="photo-viewer" element={<PhotoViewer />} />
        <Route path="photo-popup" element={<PhotoPopup />} />
        <Route path="photo-mail-send/:est_serial?" element={<PhotoMailSend />} />
        <Route path="/estsmsend" element={<SmsSend />} />
        <Route path="/estimate-memo" element={<EstimateMemo />} />
        <Route path="/estimate-deposit" element={<DepositPopup />} />
        <Route path="/est-claim-send" element={<EstClaimMailSend />} />
        <Route path="/est-customer-send" element={<EstCustomerMailSend />} />
        <Route path="/mail-history" element={<MailHistoryPage />} />
        <Route path="/notice" element={<NoticePage />} />
        <Route path="/notice-view" element={<NoticeViewPage />} />
        <Route path="/labor-items" element={<LaborItemsPopup />} />
        <Route path="/work-order" element={<WorkOrderPopup />} />
        <Route path="paint-items" element={<PaintItemsPopup />} />
        <Route path="chemical-items" element={<ChemicalItemsPopup />} />
        <Route path="part-lookup" element={<PartLookupPopup />} />
        <Route path="/print/inspection-estimate" element={<InspectionEstimatePrint />} />
        <Route path="/print/inspection-statement" element={<InspectionStatementPrint />} />
        <Route path="/print/insurance-claim" element={<InsuranceClaimPrint />} />
        <Route path="/print/general-repair-claim" element={<GeneralRepairClaimPrint />} />
        <Route path="/print/work-order" element={<WorkOrderPrint />} />
        <Route path="/print/privacy-consent" element={<PrivacyConsentPrint />} />
        <Route path="/print/privacy-consent/capture" element={<PrivacyConsentCapturePage />} />
        <Route path="/print/photo" element={<PhotoPrintPage />} />

        {/* 상단 고정 레이아웃 */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/estimate/insurance" element={<InsuranceEstimate key="insurance" />} />
          <Route path="/estimate-edit/:est_serial" element={<EstimateEditPage />} />
          
          {/* 나중에 여기로 페이지들 계속 추가 */}
          <Route path="/send/repair" element={<RepairHistorySend />} />
          <Route path="/send/history" element={<SmsHistoryPage />} />
          <Route path="chemical" element={<ChemicalItemsPage />} />
          <Route path="/estimate/normal" element={<InsuranceEstimate key="normal" seccode="11" />} />

          <Route path="settings">
            <Route path="basic" element={<BasicSettingsLayout />}>
              {/* <Route index element={<BasicSettingsHome />} /> */}
              <Route index element={<Navigate to="company" replace />} /> 
              <Route path="company" element={<CompanyInfoPage />} />
              <Route path="labor" element={<LaborSettingsPage />} />
              <Route path="work-status" element={<WorkStatusPage />} />
              <Route path="insurers" element={<InsurersPage />} />
              <Route path="insurer-contacts" element={<InsurerContactsPage />} />
              <Route path="users" element={<UserSettingsPage />} />
              <Route path="sms-sender" element={<SmsSenderPage />} />
            </Route>
          </Route>

        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      </LoadingProvider>
    </AlertProvider>

  );
}

