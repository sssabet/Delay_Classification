%Decision Tree
clear all 
clc
A= xlsread('Clssification.xlsx' , 'ToMatlab');
y= A(:,1);
x=A(:,2:9);
x=round(x);
% 'names',['Mouse', 'Temporal Accuracy'	,'Spatial Accuracy'	,'Perdicitibilty'	,'Punishment'	,'Number of Objects'	,'Meaningfulness of Actions'	,'Actions per Minute','Feedback Frequency']);
t= fitctree(x,y);
% view(t)
view(t,'Mode','graph')
resuberror = resubLoss(t);
