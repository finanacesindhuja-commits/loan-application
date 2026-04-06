const axios = require('axios');
const FormData = require('form-data');

async function testSubmission() {
    console.log('Starting Mock Submission Test...');
    const API_URL = 'http://localhost:5005';
    
    const FD = new FormData();
    FD.append('memberId', '2');
    FD.append('centerId', '2');
    FD.append('memberCibil', '750');
    FD.append('personName', 'Test Member');
    FD.append('dateofbirth', '1990-01-01');
    FD.append('gender', 'Female');
    FD.append('religion', 'Hindu');
    FD.append('maritalStatus', 'Married');
    FD.append('aadharNo', '123456789012');
    FD.append('memberwork', 'Business');
    FD.append('annualIncome', '500000');
    FD.append('nomineeName', 'Nominee');
    FD.append('nomineeDob', '1985-05-05');
    FD.append('nomineeGender', 'Male');
    FD.append('nomineeReligion', 'Hindu');
    FD.append('nomineeMaritalStatus', 'Married');
    FD.append('nomineeRelationship', 'Spouse');
    FD.append('nomineeBusiness', 'Work');
    FD.append('mobileNo', '9876543210');
    FD.append('nomineeMobile', '9876543211');
    FD.append('memberEmail', 'test@example.com');
    FD.append('address', '123 Test St');
    FD.append('pincode', '600001');
    FD.append('staffId', 'STF001');
    FD.append('staffName', 'Test Staff');
    FD.append('centerName', 'Center A');
    FD.append('memberName', 'Test Member');
    
    // NEW FIELD
    FD.append('firstCycleRgNumber', 'RG-TEST-123456');

    try {
        const res = await axios.post(`${API_URL}/api/loans`, FD, {
            headers: FD.getHeaders()
        });
        console.log('Submission Success:', res.data);
    } catch (err) {
        console.error('Submission Error:', err.response?.data || err.message);
    }
}

testSubmission();
